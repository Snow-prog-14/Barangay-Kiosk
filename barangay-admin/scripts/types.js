import { API_URL, applyRoleBasedUI, getCurrentUser } from './app.js?v=3';

const currentUser = getCurrentUser();
const userInfo = {
  user_id: currentUser ? currentUser.id : 0,
  user_name: currentUser ? currentUser.full_name : 'System'
};

const typesList = document.getElementById('typesList');
const formAdd = document.getElementById('formAdd');
const modalTitle = document.getElementById('mdlTitle');
const addModal = new bootstrap.Modal(document.getElementById('mdlAdd'));

const logsModal = new bootstrap.Modal(document.getElementById('mdlTypeLogs'));
const logsModalTitle = document.getElementById('logsModalTitle');
const logsModalBody = document.getElementById('logsModalBody');

const templateSelect = document.getElementById('aFormTemplate');
const fieldsBox = document.getElementById('customFieldsBox');

let currentEditId = null;

// =========================
// Helpers
// =========================
function toggleFieldsBox() {
  if (!templateSelect || !fieldsBox) return;

  fieldsBox.style.display =
    templateSelect.value === 'Custom' ? 'block' : 'none';
}

/**
 * ✅ Collect "Request Sections" checklist values.
 * Works with your current HTML (.section-checkbox) and other possible selectors.
 * (Does not break anything if none exist.)
 */
function getSelectedRequestSections() {
  const selectors = [
    'input[name="request_sections"]:checked',
    '.request-section:checked',
    '.req-section:checked',
    '.section-field:checked',
    '.section-checkbox:checked', // ✅ your HTML uses this
    '#requestSections input[type="checkbox"]:checked',
    '#request-sections input[type="checkbox"]:checked',
  ];

  let checked = [];
  for (const sel of selectors) {
    const found = [...document.querySelectorAll(sel)];
    if (found.length) {
      checked = found.map(cb => cb.value);
      break;
    }
  }

  // normalize: trim and remove empties/duplicates
  return [...new Set(checked.map(v => String(v).trim()).filter(Boolean))];
}

/**
 * ✅ Apply saved sections back to the checklist on edit
 */
function applyRequestSectionsToUI(saved) {
  // accept array OR comma-separated string OR null
  let values = [];
  if (Array.isArray(saved)) values = saved;
  else if (typeof saved === 'string') values = saved.split(',').map(s => s.trim()).filter(Boolean);

  values = values.map(v => String(v).trim());

  const selectorsAll = [
    'input[name="request_sections"]',
    '.request-section',
    '.req-section',
    '.section-field',
    '.section-checkbox', // ✅ your HTML uses this
    '#requestSections input[type="checkbox"]',
    '#request-sections input[type="checkbox"]',
  ];

  let boxes = [];
  for (const sel of selectorsAll) {
    const found = [...document.querySelectorAll(sel)];
    if (found.length) {
      boxes = found;
      break;
    }
  }

  if (!boxes.length) return;

  // clear first
  boxes.forEach(cb => (cb.checked = false));

  // re-check
  boxes.forEach(cb => {
    const val = String(cb.value).trim();
    if (values.includes(val)) cb.checked = true;
  });
}

// =========================
// Render
// =========================
function renderTypeCard(type) {
  const status = type.is_active == 1
    ? '<span class="badge bg-success">Active</span>'
    : '<span class="badge bg-secondary">Inactive</span>';

  return `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${type.name}</h5>
          <p class="card-text">${status}</p>

          <div class="mt-auto d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-outline-info btn-view-logs"
              data-id="${type.id}" data-name="${type.name}">
              <i class="bi bi-clock-history"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary btn-edit"
              data-id="${type.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete"
              data-id="${type.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =========================
// Fetch & Render
// =========================
async function fetchAndRenderTypes() {
  try {
    // ✅ FIX: cache-bust so newly added types always show
    const res = await fetch(`${API_URL}/types.php?t=${Date.now()}`);
    const types = await res.json();

    typesList.innerHTML = '';

    if (!Array.isArray(types) || !types.length) {
      typesList.innerHTML = '<p class="text-muted">No request types yet.</p>';
      return;
    }

    types.forEach(t =>
      typesList.insertAdjacentHTML('beforeend', renderTypeCard(t))
    );

    applyRoleBasedUI();
  } catch (err) {
    console.error('Failed to load types:', err);
    typesList.innerHTML = '<p class="text-danger">Failed to load types.</p>';
  }
}

// =========================
// Edit
// =========================
async function handleEditClick(id) {
  try {
    // ✅ FIX: cache-bust
    const res = await fetch(`${API_URL}/types.php?id=${id}&t=${Date.now()}`);
    const type = await res.json();

    modalTitle.textContent = 'Edit Type';
    document.getElementById('aName').value = type.name ?? '';

    // Guard: aFormTemplate may not exist
    if (templateSelect && type.form_template !== undefined) {
      templateSelect.value = type.form_template;
    }

    document.getElementById('aActive').checked = type.is_active == 1;

    // restore checklist state for Request Sections (if backend provides it)
    applyRequestSectionsToUI(type.request_sections ?? type.sections ?? type.required_sections ?? []);

    // update preview groups after restoring checks (if your HTML exposes it)
    if (typeof window.updateGroups === 'function') window.updateGroups();

    toggleFieldsBox();
    currentEditId = id;
    addModal.show();
  } catch (err) {
    console.error('Edit failed:', err);
  }
}

// =========================
// Delete
// =========================
async function handleDeleteClick(id) {
  if (!confirm('Archive this type?')) return;

  try {
    await fetch(
      `${API_URL}/types.php?id=${id}&user_id=${userInfo.user_id}&user_name=${encodeURIComponent(userInfo.user_name)}`,
      { method: 'DELETE' }
    );

    fetchAndRenderTypes();
  } catch (err) {
    console.error('Delete failed:', err);
  }
}

// =========================
// Logs
// =========================
async function handleViewLogsClick(id, name) {
  try {
    logsModalTitle.textContent = `Audit Log: ${name}`;
    logsModalBody.innerHTML = 'Loading...';
    logsModal.show();

    const res = await fetch(`${API_URL}/type_logs.php?type_id=${id}`);
    const logs = await res.json();

    if (!Array.isArray(logs) || !logs.length) {
      logsModalBody.innerHTML = '<p class="text-muted">No logs found.</p>';
      return;
    }

    logsModalBody.innerHTML = `
      <ul class="list-group">
        ${logs.map(l => `
          <li class="list-group-item">
            <strong>${l.action}</strong> by ${l.user_name}
            <small class="d-block text-muted">
              ${new Date(l.timestamp).toLocaleString()}
            </small>
            <small>${l.details || ''}</small>
          </li>
        `).join('')}
      </ul>
    `;
  } catch (err) {
    console.error('Failed to load logs:', err);
    logsModalBody.innerHTML = '<p class="text-danger">Failed to load logs.</p>';
  }
}

// =========================
// Submit
// =========================
async function handleFormSubmit(e) {
  e.preventDefault();

  const requiredFields = [];
  document.querySelectorAll('.req-field:checked')
    .forEach(cb => requiredFields.push(cb.value));

  // Request Sections checklist values
  const requestSections = getSelectedRequestSections();

  const payload = {
    id: currentEditId,
    name: document.getElementById('aName').value,
    form_template: templateSelect ? templateSelect.value : null,
    required_fields: requiredFields,
    request_sections: requestSections,
    is_active: document.getElementById('aActive').checked,
    ...userInfo
  };

  try {
    const res = await fetch(`${API_URL}/types.php`, {
      method: currentEditId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    // ✅ FIX: do not silently pretend save worked
    if (!res.ok) {
      console.error('Save failed:', data);
      alert(data.error || 'Failed to save type.');
      return;
    }

    addModal.hide();
    formAdd.reset();

    // clear section checkboxes & preview groups after save
    applyRequestSectionsToUI([]);
    if (typeof window.updateGroups === 'function') window.updateGroups();

    currentEditId = null;
    toggleFieldsBox();

    // ✅ FIX: await refresh + cache-bust already inside fetchAndRenderTypes
    await fetchAndRenderTypes();
  } catch (err) {
    console.error('Save failed:', err);
    alert('Save failed. Check console/network.');
  }
}

// =========================
// Init
// =========================
export function initializeTypesPage() {
  fetchAndRenderTypes();
  toggleFieldsBox();

  if (templateSelect) {
    templateSelect.addEventListener('change', toggleFieldsBox);
  }

  formAdd.addEventListener('submit', handleFormSubmit);

  document.getElementById('btnAddType').addEventListener('click', () => {
    currentEditId = null;
    modalTitle.textContent = 'Add Type';
    formAdd.reset();

    // clear checklist + preview groups when opening Add
    applyRequestSectionsToUI([]);
    if (typeof window.updateGroups === 'function') window.updateGroups();

    toggleFieldsBox();
  });

  typesList.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-edit')) {
      handleEditClick(btn.dataset.id);
    }

    if (btn.classList.contains('btn-delete')) {
      handleDeleteClick(btn.dataset.id);
    }

    if (btn.classList.contains('btn-view-logs')) {
      handleViewLogsClick(btn.dataset.id, btn.dataset.name);
    }
  });
}
