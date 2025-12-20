import { API_URL, applyRoleBasedUI, getCurrentUser } from './app.js?v=3';

// --- 1. Get Current User Info ---
const currentUser = getCurrentUser();
const userInfo = {
  user_id: currentUser ? currentUser.id : 0,
  user_name: currentUser ? currentUser.full_name : 'System'
};

// --- 2. Get DOM Elements ---
const typesList = document.getElementById('typesList');
const formAdd = document.getElementById('formAdd');
const addModalEl = document.getElementById('mdlAdd');
const addModal = new bootstrap.Modal(addModalEl);
const modalTitle = document.getElementById('mdlTitle');

// Log Modal
const logsModalEl = document.getElementById('mdlTypeLogs');
const logsModal = new bootstrap.Modal(logsModalEl);
const logsModalTitle = document.getElementById('logsModalTitle');
const logsModalBody = document.getElementById('logsModalBody');

const templateSelect = document.getElementById('aFormTemplate');
const fieldsBox = document.getElementById('customFieldsBox');

let currentEditId = null;

// --- 3. Helper: Show/Hide Required Fields ---
function toggleFieldsBox() {
  fieldsBox.style.display =
    templateSelect.value === 'Custom' ? 'block' : 'none';
}

// --- 4. Render Functions ---
function renderTypeCard(type) {
  const statusBadge = type.is_active == 1
    ? `<span class="badge bg-success">Active</span>`
    : `<span class="badge bg-secondary">Inactive</span>`;

  return `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${type.name}</h5>
          <p class="card-text mb-1">
            Fee: <strong>₱${parseFloat(type.fee).toFixed(2)}</strong>
          </p>
          <p class="card-text">${statusBadge}</p>

          <div class="mt-auto d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-outline-info admin-only btn-view-logs"
              data-id="${type.id}" data-name="${type.name}">
              <i class="bi bi-clock-history"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary admin-only btn-edit"
              data-id="${type.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger admin-only btn-delete"
              data-id="${type.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <div class="card-footer bg-transparent border-top-0">
          <small class="text-muted">ID: ${type.id}</small>
        </div>
      </div>
    </div>
  `;
}

// --- 5. Fetch & Render ---
async function fetchAndRenderTypes() {
  try {
    const response = await fetch(`${API_URL}/types.php?t=${Date.now()}`);
    if (!response.ok) throw new Error('Failed to fetch request types');

    const types = await response.json();
    typesList.innerHTML = '';

    if (types.length === 0) {
      typesList.innerHTML =
        '<p class="text-center text-muted">No request types defined yet.</p>';
      return;
    }

    types.forEach(type => {
      typesList.innerHTML += renderTypeCard(type);
    });

    applyRoleBasedUI();

  } catch (error) {
    console.error(error);
    typesList.innerHTML =
      '<p class="text-center text-danger">Error loading data.</p>';
  }
}

// --- 6. Logs ---
async function handleViewLogsClick(typeId, typeName) {
  logsModalTitle.textContent = `Audit Log for: ${typeName}`;
  logsModalBody.innerHTML = '<p>Loading logs...</p>';
  logsModal.show();

  try {
    const response = await fetch(`${API_URL}/type_logs.php?type_id=${typeId}`);
    const logs = await response.json();

    if (logs.length === 0) {
      logsModalBody.innerHTML =
        '<p class="text-muted">No audit logs found.</p>';
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
            <small>${l.details}</small>
          </li>
        `).join('')}
      </ul>
    `;
  } catch {
    logsModalBody.innerHTML =
      '<p class="text-danger">Failed to load logs.</p>';
  }
}

// --- 7. Edit ---
async function handleEditClick(id) {
  try {
    const response = await fetch(`${API_URL}/types.php?id=${id}`);
    const type = await response.json();

    modalTitle.textContent = 'Edit Type';
    document.getElementById('aName').value = type.name;
    document.getElementById('aFee').value = type.fee;
    document.getElementById('aFormTemplate').value = type.form_template;
    document.getElementById('aActive').checked = type.is_active == 1;

    // ✅ RESTORE REQUIRED FIELDS
    document.querySelectorAll('.req-field').forEach(cb => {
      cb.checked = type.required_fields?.includes(cb.value);
    });

    toggleFieldsBox();

    currentEditId = id;
    addModal.show();

  } catch {
    alert('Could not load type for editing.');
  }
}

// --- 8. Delete ---
async function handleDeleteClick(id) {
  if (!confirm('Archive this type?')) return;

  try {
    await fetch(
      `${API_URL}/types.php?id=${id}&user_id=${userInfo.user_id}&user_name=${encodeURIComponent(userInfo.user_name)}`,
      { method: 'DELETE' }
    );
    fetchAndRenderTypes();
  } catch {
    alert('Failed to archive type.');
  }
}

// --- 9. Submit (Add / Edit) ---
async function handleFormSubmit(e) {
  e.preventDefault();

  // ✅ COLLECT REQUIRED FIELDS
  const requiredFields = [];
  document.querySelectorAll('.req-field:checked')
    .forEach(cb => requiredFields.push(cb.value));

  const formData = {
    id: currentEditId,
    name: document.getElementById('aName').value,
    fee: document.getElementById('aFee').value,
    form_template: document.getElementById('aFormTemplate').value,
    required_fields: requiredFields,
    is_active: document.getElementById('aActive').checked
  };

  const dataToSend = { ...formData, ...userInfo };
  const method = currentEditId ? 'PUT' : 'POST';

  try {
    await fetch(`${API_URL}/types.php`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    });

    addModal.hide();
    formAdd.reset();
    modalTitle.textContent = 'Add Type';
    currentEditId = null;
    fetchAndRenderTypes();

  } catch {
    alert('Failed to save type.');
  }
}

// --- 10. Init ---
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
