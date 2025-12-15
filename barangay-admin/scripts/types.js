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

// Get Log Modal Elements
const logsModalEl = document.getElementById('mdlTypeLogs');
const logsModal = new bootstrap.Modal(logsModalEl);
const logsModalTitle = document.getElementById('logsModalTitle');
const logsModalBody = document.getElementById('logsModalBody');

let currentEditId = null;

// --- 3. Render Functions ---

// Renders a single card
function renderTypeCard(type) {
  const statusBadge = type.is_active == 1 
    ? `<span class="badge bg-success">Active</span>`
    : `<span class="badge bg-secondary">Inactive</span>`;

  return `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${type.name}</h5>
          <p class="card-text mb-1">Fee: <strong>₱${parseFloat(type.fee).toFixed(2)}</strong></p>
          <p class="card-text">${statusBadge}</p>
          <div class="mt-auto d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-outline-info admin-only btn-view-logs" data-id="${type.id}" data-name="${type.name}" title="View Logs">
              <i class="bi bi-clock-history"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary admin-only btn-edit" data-id="${type.id}" title="Edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger admin-only btn-delete" data-id="${type.id}" title="Archive">
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

// Fetches all types and renders them
async function fetchAndRenderTypes() {
  try {
    const response = await fetch(`${API_URL}/types.php?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error('Failed to fetch request types');
    
    const types = await response.json();
    typesList.innerHTML = ''; 

    if (types.length === 0) {
      typesList.innerHTML = '<p class="text-center text-muted">No request types defined yet.</p>';
      return;
    }

    types.forEach(type => {
      typesList.innerHTML += renderTypeCard(type);
    });
    
    applyRoleBasedUI();

  } catch (error) {
    console.error('Error:', error);
    typesList.innerHTML = `<p class="text-center text-danger">Error loading data.</p>`;
  }
}

// --- 4. Event Handler Functions ---

// Handle "View Logs" button click
async function handleViewLogsClick(typeId, typeName) {
  logsModalTitle.textContent = `Audit Log for: ${typeName}`;
  logsModalBody.innerHTML = '<p>Loading logs...</p>';
  logsModal.show();

  try {
    const response = await fetch(`${API_URL}/type_logs.php?type_id=${typeId}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    
    const logs = await response.json();

    if (logs.length === 0) {
      logsModalBody.innerHTML = '<p class="text-muted">No audit logs found for this item.</p>';
      return;
    }

    let logList = '<ul class="list-group">';
    logs.forEach(log => {
      const logTime = new Date(log.timestamp).toLocaleString();
      logList += `
        <li class="list-group-item">
          <strong>${log.action}</strong> by <strong>${log.user_name}</strong>
          <small class="d-block text-muted">${logTime}</small>
          <small class="d-block" style="font-size: 0.8em;">${log.details}</small>
        </li>
      `;
    });
    logList += '</ul>';
    
    logsModalBody.innerHTML = logList;

  } catch (error) {
    console.error('Log Fetch Error:', error);
    logsModalBody.innerHTML = '<p class="text-danger">An error occurred while fetching logs.</p>';
  }
}

// Handle "Edit" button click
async function handleEditClick(id) {
  try {
    const response = await fetch(`${API_URL}/types.php?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch type data');
    const type = await response.json();

    modalTitle.textContent = 'Edit Type';
    document.getElementById('aName').value = type.name;
    document.getElementById('aFee').value = type.fee;
    
    // --- THIS IS THE FIX ---
    document.getElementById('aFormTemplate').value = type.form_template; // Set dropdown value
    // --- END FIX ---
    
    document.getElementById('aActive').checked = (type.is_active == 1);
    
    currentEditId = id;
    addModal.show();
  } catch (error) {
    console.error('Edit Error:', error);
    alert('Could not load type data for editing.');
  }
}

// Handle "Delete" (Archive) button click
async function handleDeleteClick(id) {
  if (!confirm('Are you sure you want to archive this type? It will be hidden from this list.')) {
    return;
  }
  try {
    const url = `${API_URL}/types.php?id=${id}&user_id=${userInfo.user_id}&user_name=${encodeURIComponent(userInfo.user_name)}`;
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to archive type');
    }
    alert('Type archived successfully.');
    fetchAndRenderTypes();
  } catch (error) {
    console.error('Delete Error:', error);
    alert(error.message);
  }
}

// Handle the "Add" / "Edit" form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = {
    id: currentEditId,
    name: document.getElementById('aName').value,
    fee: document.getElementById('aFee').value,
    
    // --- THIS IS THE FIX ---
    form_template: document.getElementById('aFormTemplate').value, // Get dropdown value
    // --- END FIX ---

    is_active: document.getElementById('aActive').checked
  };

  const dataToSend = { ...formData, ...userInfo };
  const isEditing = (currentEditId !== null);
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const response = await fetch(`${API_URL}/types.php`, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save type');
    }
    addModal.hide();
    formAdd.reset();
    alert(isEditing ? 'Type updated successfully.' : 'Type added successfully.');
    fetchAndRenderTypes();
  } catch (error) {
    console.error('Submit Error:', error);
    alert(error.message);
  } finally {
    currentEditId = null;
    modalTitle.textContent = 'Add Type';
  }
}

// --- 5. Initializer Function ---
export function initializeTypesPage() {
  fetchAndRenderTypes();
  formAdd.addEventListener('submit', handleFormSubmit);

  // Reset modal on "Add Type" button click
  document.getElementById('btnAddType').addEventListener('click', () => {
    currentEditId = null;
    modalTitle.textContent = 'Add Type';
    formAdd.reset();
  });

  // Event delegation for all card buttons
  typesList.addEventListener('click', (e) => {
    const button = e.target.closest('button.admin-only');
    if (!button) return;

    const id = button.dataset.id;
    if (button.classList.contains('btn-edit')) {
      handleEditClick(id);
    }
    if (button.classList.contains('btn-delete')) {
      handleDeleteClick(id);
    }
    if (button.classList.contains('btn-view-logs')) {
      const name = button.dataset.name;
      handleViewLogsClick(id, name);
    }
  });
}
