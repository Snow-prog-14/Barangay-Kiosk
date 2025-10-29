import { TYPES } from './data.js';
import { isStaff, guard, wireLogout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  guard(); // will hide admin controls for staff

  const container = document.getElementById('typesList') || document.getElementById('rows');
  if (container) renderTypesGrid(container);

  wireLogout('btnLogout');
});

// Function to render types and their actions
function renderTypesGrid(container) {
  const t = TYPES || [];
  container.innerHTML = t.map(type => `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="border rounded p-3 h-100">
        <div class="d-flex justify-content-between">
          <div>
            <div class="fw-semibold">${type.name}</div>
            <div class="small text-muted">${type.active ? 'Active' : 'Inactive'}</div>
          </div>
          <div class="text-end">
            <div class="badge badge-ref">₱${Number(type.fee).toFixed(2)}</div>
          </div>
        </div>

        <div class="mt-2 d-flex gap-2">
          ${isStaff() ? '' : `
            <button class="btn btn-sm btn-outline-secondary admin-only" data-edit="${type.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger admin-only" data-delete="${type.id}">Delete</button>
          `}
        </div>

        <div class="small text-muted mt-2">ID: ${type.id}</div>
      </div>
    </div>
  `).join('');

  // Add event listeners for Edit and Delete buttons
  document.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = e.target.dataset.edit;
      const type = TYPES.find(t => t.id == id);
      if (type) {
        // Prefill the modal with the selected type's data
        document.getElementById('aName').value = type.name;
        document.getElementById('aFee').value = type.fee;
        document.getElementById('aActive').checked = type.active;
        document.getElementById('formAdd').dataset.editId = type.id; // Store the id for editing
        document.getElementById('mdlTitle').textContent = 'Edit Type'; // Change modal title to 'Edit'
        new bootstrap.Modal(document.getElementById('mdlAdd')).show(); // Show modal
      }
    });
  });

  // Handle Delete button click
  document.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = e.target.dataset.delete;
      const index = TYPES.findIndex(t => t.id == id);
      if (index > -1) {
        TYPES.splice(index, 1); // Remove the type from the array
        renderTypesGrid(container); // Re-render the grid after deletion
      }
    });
  });
}

// Handling the submission of the Add/Edit form
document.getElementById('formAdd').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = document.getElementById('aName').value.trim();
  const fee = parseFloat(document.getElementById('aFee').value.trim());
  const active = document.getElementById('aActive').checked;

  if (!name || isNaN(fee)) return;

  const editId = e.target.dataset.editId;

  if (editId) {
    // Edit existing type
    const typeIndex = TYPES.findIndex(type => type.id == editId);
    if (typeIndex !== -1) {
      TYPES[typeIndex] = { id: editId, name, fee, active };
      document.getElementById('toastMsg').textContent = 'Type updated successfully.';
    }
  } else {
    // Add new type
    const newId = (Math.max(...TYPES.map(t => t.id)) + 1) || 1;
    TYPES.push({ id: newId, name, fee, active });
    document.getElementById('toastMsg').textContent = 'Type added successfully.';
  }

  new bootstrap.Modal(document.getElementById('mdlAdd')).hide(); // Hide modal
  renderTypesGrid(document.getElementById('typesList')); // Re-render types grid
  new bootstrap.Toast(document.getElementById('toastOk')).show(); // Show success toast

  // Reset form
  document.getElementById('formAdd').reset();
  delete e.target.dataset.editId;
});
