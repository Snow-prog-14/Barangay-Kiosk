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
  fieldsBox.style.display =
    templateSelect.value === 'Custom' ? 'block' : 'none';
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
  const res = await fetch(`${API_URL}/types.php`);
  const types = await res.json();

  typesList.innerHTML = '';
  if (!types.length) {
    typesList.innerHTML = '<p class="text-muted">No request types yet.</p>';
    return;
  }

  types.forEach(t => typesList.innerHTML += renderTypeCard(t));
  applyRoleBasedUI();
}

// =========================
// Edit
// =========================
async function handleEditClick(id) {
  const res = await fetch(`${API_URL}/types.php?id=${id}`);
  const type = await res.json();

  modalTitle.textContent = 'Edit Type';
  document.getElementById('aName').value = type.name;
  document.getElementById('aFormTemplate').value = type.form_template;
  document.getElementById('aActive').checked = type.is_active == 1;

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
    `${API_URL}/types.php?id=${id}&user_id=${userInfo.user_id}&user_name=${encodeURIComponent(userInfo.user_name)}`,
    { method: 'DELETE' }
  );

  fetchAndRenderTypes();
}

// =========================
// Logs
// =========================
async function handleViewLogsClick(id, name) {
  logsModalTitle.textContent = `Audit Log: ${name}`;
  logsModalBody.innerHTML = 'Loading...';
  logsModal.show();

  const res = await fetch(`${API_URL}/type_logs.php?type_id=${id}`);
  const logs = await res.json();

  if (!logs.length) {
    logsModalBody.innerHTML = '<p class="text-muted">No logs found.</p>';
    return;
  }

  logsModalBody.innerHTML = `
    <ul class="list-group">
      ${logs.map(l => `
        <li class="list-group-item">
          <strong>${l.action}</strong> by ${l.user_name}
          <small class="d-block text-muted">${new Date(l.timestamp).toLocaleString()}</small>
          <small>${l.details}</small>
        </li>
      `).join('')}
    </ul>
  `;
}

// =========================
// Submit
// =========================
async function handleFormSubmit(e) {
  e.preventDefault();

  const requiredFields = [];
  document.querySelectorAll('.req-field:checked')
    .forEach(cb => requiredFields.push(cb.value));

  const payload = {
    id: currentEditId,
    name: document.getElementById('aName').value,
    form_template: document.getElementById('aFormTemplate').value,
    required_fields: requiredFields,
    is_active: document.getElementById('aActive').checked,
    ...userInfo
  };

  await fetch(`${API_URL}/types.php`, {
    method: currentEditId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  addModal.hide();
  formAdd.reset();
  currentEditId = null;
  fetchAndRenderTypes();
}

// =========================
// Init
// =========================
export function initializeTypesPage() {
  fetchAndRenderTypes();
  toggleFieldsBox();

  templateSelect.addEventListener('change', toggleFieldsBox);
  formAdd.addEventListener('submit', handleFormSubmit);

  document.getElementById('btnAddType').addEventListener('click', () => {
    currentEditId = null;
    modalTitle.textContent = 'Add Type';
    formAdd.reset();
    toggleFieldsBox();
  });

  typesList.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('btn-edit')) handleEditClick(btn.dataset.id);
    if (btn.classList.contains('btn-delete')) handleDeleteClick(btn.dataset.id);
    if (btn.classList.contains('btn-view-logs'))
      handleViewLogsClick(btn.dataset.id, btn.dataset.name);
  });
}
