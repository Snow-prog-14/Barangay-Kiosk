import { USERS } from './data.js';
import { isStaff, guard, wireLogout } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  guard();
  const container = document.getElementById('usersList');
  if (container) renderUsersGrid(container);
  wireLogout('btnLogout');
});

// Render all users
function renderUsersGrid(container) {
  container.innerHTML = (USERS || []).map(user => `
    <div class="col-md-6 col-lg-4">
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h6 class="mb-0 fw-semibold">${user.name}</h6>
              <div class="small text-muted">@${user.username}</div>
              <span class="badge bg-secondary mt-2">${user.role}</span>
            </div>
            <div class="text-end">
              <span class="badge ${user.active ? 'bg-success' : 'bg-danger'}">
                ${user.active ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>

          <div class="mt-3 d-flex gap-2">
            ${isStaff() ? '' : `
              <button class="btn btn-sm btn-outline-primary" title="Change Password" data-password="${user.id}">
                <i class="bi bi-key"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary" title="Edit" data-edit="${user.id}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" title="Delete" data-delete="${user.id}">
                <i class="bi bi-trash"></i>
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Event Listeners
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('button').dataset.edit;
      const user = USERS.find(u => u.id == id);
      if (user) {
        document.getElementById('aName').value = user.name;
        document.getElementById('aUser').value = user.username;
        document.getElementById('aRole').value = user.role;
        document.getElementById('aActive').value = user.active ? 1 : 0;
        document.getElementById('formAdd').dataset.editId = user.id;
        document.getElementById('mdlTitle').textContent = 'Edit User';
        new bootstrap.Modal(document.getElementById('mdlAdd')).show();
      }
    });
  });

  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('button').dataset.delete;
      const index = USERS.findIndex(u => u.id == id);
      if (index > -1 && confirm('Are you sure you want to delete this user?')) {
        USERS.splice(index, 1);
        renderUsersGrid(container);
        showToast('User deleted successfully.');
      }
    });
  });

  document.querySelectorAll('[data-password]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('button').dataset.password;
      const user = USERS.find(u => u.id == id);
      if (user) showToast(`🔑 Password reset link has been sent to ${user.username}.`);
    });
  });
}

// Handle Add/Edit form
document.getElementById('formAdd').addEventListener('submit', e => {
  e.preventDefault();

  const name = document.getElementById('aName').value.trim();
  const username = document.getElementById('aUser').value.trim();
  const role = document.getElementById('aRole').value;
  const active = document.getElementById('aActive').value;
  const editId = e.target.dataset.editId;

  if (!name || !username) return;

  if (editId) {
    const userIndex = USERS.findIndex(user => user.id == editId);
    if (userIndex !== -1) {
      USERS[userIndex].role = role;
      USERS[userIndex].active = active === '1';
      showToast('User updated successfully.');
    }
  } else {
    const newId = (Math.max(...USERS.map(u => u.id)) + 1) || 1;
    USERS.push({ id: newId, name, username, role, active: active === '1' });
    showToast('New user added successfully.');
  }

  const modal = bootstrap.Modal.getInstance(document.getElementById('mdlAdd'));
  modal.hide();
  renderUsersGrid(document.getElementById('usersList'));
  e.target.reset();
  delete e.target.dataset.editId;
});

// Toast Helper
function showToast(message) {
  const toastEl = document.getElementById('toastOk');
  document.getElementById('toastMsg').textContent = message;
  new bootstrap.Toast(toastEl).show();
}
