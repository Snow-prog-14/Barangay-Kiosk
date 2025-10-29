import { USERS } from './data.js';
import { isStaff, guard, wireLogout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  guard(); // Will hide admin controls for staff

  const container = document.getElementById('usersList');
  if (container) renderUsersGrid(container);

  wireLogout('btnLogout');
});

// Function to render users and their actions
function renderUsersGrid(container) {
  const t = USERS || [];
  container.innerHTML = t.map(user => `
    <div class="col-md-6 col-lg-4 mb-3">
      <div class="border rounded p-3 h-100">
        <div class="d-flex justify-content-between">
          <div>
            <div class="fw-semibold">${user.name}</div>
            <div class="small text-muted">${user.role}</div>
          </div>
          <div class="text-end">
            <div class="badge badge-ref">${user.active ? 'Active' : 'Inactive'}</div>
          </div>
        </div>

        <div class="mt-2 d-flex gap-2">
          ${isStaff() ? '' : `
            <button class="btn btn-sm btn-outline-secondary admin-only" data-edit="${user.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger admin-only" data-delete="${user.id}">Delete</button>
          `}
        </div>

        <div class="small text-muted mt-2">ID: ${user.id}</div>
      </div>
    </div>
  `).join('');

  // Add event listeners for Edit and Delete buttons
  document.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = e.target.dataset.edit;
      const user = USERS.find(u => u.id == id);
      if (user) {
        // Prefill the modal with the selected user's data
        document.getElementById('aName').value = user.name;
        document.getElementById('aUser').value = user.username;
        document.getElementById('aRole').value = user.role;
        document.getElementById('aActive').value = user.active ? 1 : 0;
        document.getElementById('formAdd').dataset.editId = user.id; // Store the id for editing
        document.getElementById('mdlTitle').textContent = 'Edit User'; // Change modal title to 'Edit'
        new bootstrap.Modal(document.getElementById('mdlAdd')).show(); // Show modal
      }
    });
  });

  // Handle Delete button click
  document.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', (e) => {
      const id = e.target.dataset.delete;
      const index = USERS.findIndex(u => u.id == id);
      if (index > -1) {
        USERS.splice(index, 1); // Remove the user from the array
        renderUsersGrid(container); // Re-render the grid after deletion
      }
    });
  });
}

// Handling the submission of the Add/Edit form
document.getElementById('formAdd').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = document.getElementById('aName').value.trim();
  const username = document.getElementById('aUser').value.trim();
  const role = document.getElementById('aRole').value;
  const active = document.getElementById('aActive').value;

  if (!name || !username) return;

  const editId = e.target.dataset.editId;

  if (editId) {
    // Edit existing user
    const userIndex = USERS.findIndex(user => user.id == editId);
    if (userIndex !== -1) {
      USERS[userIndex] = { id: editId, name, username, role, active: active === '1' };
      document.getElementById('toastMsg').textContent = 'User updated successfully.';
    }
  } else {
    // Add new user
    const newId = (Math.max(...USERS.map(u => u.id)) + 1) || 1;
    USERS.push({ id: newId, name, username, role, active: active === '1' });
    document.getElementById('toastMsg').textContent = 'User added successfully.';
  }

  new bootstrap.Modal(document.getElementById('mdlAdd')).hide(); // Hide modal
  renderUsersGrid(document.getElementById('usersList')); // Re-render users grid
  new bootstrap.Toast(document.getElementById('toastOk')).show(); // Show success toast

  // Reset form
  document.getElementById('formAdd').reset();
  delete e.target.dataset.editId;
});
