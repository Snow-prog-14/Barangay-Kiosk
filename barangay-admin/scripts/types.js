import { API_URL, applyRoleBasedUI, getCurrentUser } from './app.js?v=3';

const currentUser = getCurrentUser();
const userInfo = {
  user_id: currentUser ? currentUser.id : 0,
  user_name: currentUser ? currentUser.full_name : 'System'
};

let currentEditId = null;

// DOM (assigned on init)
let typesList = null;
let formAdd = null;
let modalTitle = null;
let addModal = null;

let logsModal = null;
let logsModalTitle = null;
let logsModalBody = null;

let templateSelect = null;
let fieldsBox = null;

// =========================
// Helpers
// =========================
function toggleFieldsBox() {
  if (!templateSelect || !fieldsBox) return;
  fieldsBox.style.display = (templateSelect.value === 'Custom') ? 'block' : 'none';
}

function getSelectedRequestSections() {
  const checked = Array.from(document.querySelectorAll('.section-checkbox:checked'))
    .map(cb => String(cb.value).trim())
    .filter(Boolean);

  return Array.from(new Set(checked));
}

function applyRequestSectionsToUI(saved) {
  let values = [];
  if (Array.isArray(saved)) values = saved;
  else if (typeof saved === 'string') values = saved.split(',').map(s => s.trim()).filter(Boolean);

  values = values.map(v => String(v).trim().replace(/[{}]/g, ''));

  const boxes = Array.from(document.querySelectorAll('.section-checkbox'));
  if (!boxes.length) return;

  boxes.forEach(cb => { cb.checked = false; });

  boxes.forEach(cb => {
    const val = String(cb.value).trim();
    if (values.includes(val)) cb.checked = true;
  });
}

// =========================
// Render
// =========================
function renderTypeCard(type) {
  const status = (type.is_active == 1)
    ? '<span class="badge bg-success">Active</span>'
    : '<span class="badge bg-secondary">Inactive</span>';

  return (
    '<div class="col-md-6 col-lg-4 mb-3">' +
      '<div class="card shadow-sm h-100">' +
        '<div class="card-body d-flex flex-column">' +
          '<h5 class="card-title">' + (type.name || '') + '</h5>' +
          '<p class="card-text">' + status + '</p>' +
          '<div class="mt-auto d-flex justify-content-end gap-2">' +
            '<button class="btn btn-sm btn-outline-info btn-view-logs" data-id="' + type.id + '" data-name="' + (type.name || '') + '">' +
              '<i class="bi bi-clock-history"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-outline-secondary btn-edit" data-id="' + type.id + '">' +
              '<i class="bi bi-pencil"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-outline-danger btn-delete" data-id="' + type.id + '">' +
              '<i class="bi bi-trash"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

// =========================
// Fetch & Render
// =========================
async function fetchAndRenderTypes() {
  const res = await fetch(API_URL + '/types.php?t=' + Date.now());
  const types = await res.json();

  typesList.innerHTML = '';

  if (!Array.isArray(types) || types.length === 0) {
    typesList.innerHTML = '<p class="text-muted">No request types yet.</p>';
    return;
  }

  types.forEach(t => {
    typesList.insertAdjacentHTML('beforeend', renderTypeCard(t));
  });

  applyRoleBasedUI();
}

// =========================
// Edit
// =========================
async function handleEditClick(id) {
  const res = await fetch(API_URL + '/types.php?id=' + encodeURIComponent(id) + '&t=' + Date.now());
  const type = await res.json();

  modalTitle.textContent = 'Edit Type';
  document.getElementById('aName').value = type.name || '';
  document.getElementById('aActive').checked = (type.is_active == 1);

  applyRequestSectionsToUI(type.request_sections || '');
  if (typeof window.updateGroups === 'function') window.updateGroups();

  toggleFieldsBox();
  currentEditId = id;
  addModal.show();
}

// =========================
// Delete
// =========================
async function handleDeleteClick(id) {
  if (!confirm('Archive this type?')) return;

  await fetch(
    API_URL + '/types.php?id=' + encodeURIComponent(id) +
      '&user_id=' + encodeURIComponent(userInfo.user_id) +
      '&user_name=' + encodeURIComponent(userInfo.user_name),
    { method: 'DELETE' }
  );

  await fetchAndRenderTypes();
}

// =========================
// Logs
// =========================
async function handleViewLogsClick(id, name) {
  logsModalTitle.textContent = 'Audit Log: ' + name;
  logsModalBody.innerHTML = 'Loading...';
  logsModal.show();

  const res = await fetch(API_URL + '/type_logs.php?type_id=' + encodeURIComponent(id));
  const logs = await res.json();

  if (!Array.isArray(logs) || logs.length === 0) {
    logsModalBody.innerHTML = '<p class="text-muted">No logs found.</p>';
    return;
  }

  const items = logs.map(l => {
    const ts = l.timestamp ? new Date(l.timestamp).toLocaleString() : '';
    return (
      '<li class="list-group-item">' +
        '<strong>' + (l.action || '') + '</strong> by ' + (l.user_name || '') +
        '<small class="d-block text-muted">' + ts + '</small>' +
        '<small>' + (l.details || '') + '</small>' +
      '</li>'
    );
  }).join('');

  logsModalBody.innerHTML = '<ul class="list-group">' + items + '</ul>';
}

// =========================
// Submit
// =========================
async function handleFormSubmit(e) {
  e.preventDefault();

  const requiredFields = Array.from(document.querySelectorAll('.req-field:checked'))
    .map(cb => String(cb.value).trim())
    .filter(Boolean);

  const requestSections = getSelectedRequestSections();

  const payload = {
    id: currentEditId,
    name: document.getElementById('aName').value,
    form_template: templateSelect ? templateSelect.value : null,
    required_fields: requiredFields,
    request_sections: requestSections,
    is_active: document.getElementById('aActive').checked,
    user_id: userInfo.user_id,
    user_name: userInfo.user_name
  };

  // ✅ IMPORTANT: show REAL server output even if it's HTML
  const url = API_URL + '/types.php?debug=1&t=' + Date.now();

  try {
    const res = await fetch(url, {
      method: currentEditId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text(); // <-- always read text first

    let data = {};
    try { data = JSON.parse(text); } catch (_) {}

    if (!res.ok) {
      console.error('Save failed. Raw response:', text);

      // Prefer JSON error, otherwise show raw text (HTML/PHP fatal)
      const msg =
        (data && data.error) ? data.error :
        (text && text.trim()) ? text :
        'Server error';

      alert(msg);
      return;
    }

    addModal.hide();
    formAdd.reset();

    applyRequestSectionsToUI([]);
    if (typeof window.updateGroups === 'function') window.updateGroups();

    currentEditId = null;
    toggleFieldsBox();

    await fetchAndRenderTypes();

  } catch (err) {
    console.error('Save failed (network/JS):', err);
    alert('Save failed: ' + (err?.message || err));
  }
}

// =========================
// Init
// =========================
export function initializeTypesPage() {
  typesList = document.getElementById('typesList');
  formAdd = document.getElementById('formAdd');
  modalTitle = document.getElementById('mdlTitle');

  addModal = new bootstrap.Modal(document.getElementById('mdlAdd'));

  logsModal = new bootstrap.Modal(document.getElementById('mdlTypeLogs'));
  logsModalTitle = document.getElementById('logsModalTitle');
  logsModalBody = document.getElementById('logsModalBody');

  templateSelect = document.getElementById('aFormTemplate');
  fieldsBox = document.getElementById('customFieldsBox');

  if (!typesList || !formAdd || !modalTitle) {
    console.error('Types page missing required elements.');
    return;
  }

  fetchAndRenderTypes().catch(err => {
    console.error('Failed to load types:', err);
    typesList.innerHTML = '<p class="text-danger">Failed to load types.</p>';
  });

  toggleFieldsBox();

  if (templateSelect) templateSelect.addEventListener('change', toggleFieldsBox);
  formAdd.addEventListener('submit', handleFormSubmit);

  const btnAdd = document.getElementById('btnAddType');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      currentEditId = null;
      modalTitle.textContent = 'Add Type';
      formAdd.reset();
      applyRequestSectionsToUI([]);
      if (typeof window.updateGroups === 'function') window.updateGroups();
      toggleFieldsBox();
    });
  }

  typesList.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-edit')) {
      handleEditClick(btn.dataset.id).catch(console.error);
    } else if (btn.classList.contains('btn-delete')) {
      handleDeleteClick(btn.dataset.id).catch(console.error);
    } else if (btn.classList.contains('btn-view-logs')) {
      handleViewLogsClick(btn.dataset.id, btn.dataset.name).catch(console.error);
    }
  });
}