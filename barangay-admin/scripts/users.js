import { guard, wireLogout, isAdmin, applyRoleBasedUI, API_URL } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  guard();
  wireLogout('btnLogout');

  if (!isAdmin()) {
  window.location.replace('dashboard.html');
  return;
}


  applyRoleBasedUI();
  initUsersPage();
});

function initUsersPage() {

  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const adminInfo = {
    admin_user_id: currentUser ? currentUser.id : 0,
    admin_user_name: currentUser ? currentUser.full_name : 'System'
  };

  const usersList = document.getElementById('usersList');
  const formAdd = document.getElementById('formAdd');
  const modalTitle = document.getElementById('mdlTitle');
  const toast = new bootstrap.Toast(document.getElementById('toastOk'));
  const toastMsg = document.getElementById('toastMsg');

  const addModal = new bootstrap.Modal(document.getElementById('mdlAdd'));
  const logsModal = new bootstrap.Modal(document.getElementById('mdlUserLogs'));
  const logsModalTitle = document.getElementById('logsModalTitle');
  const logsModalBody = document.getElementById('logsModalBody');

  let currentEditId = null;

  function renderUsers(users) {
    usersList.innerHTML = users.length ? '' : '<p class="text-center text-muted">No users found.</p>';

    users.forEach(u => {
      usersList.innerHTML += `
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>${u.full_name}</h6>
              <small>@${u.username}</small>
              <span class="badge bg-secondary ms-2">${u.role}</span>
              <div class="mt-2">
                <span class="badge ${u.is_active == 1 ? 'bg-success' : 'bg-danger'}">
                  ${u.is_active == 1 ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div class="mt-3">
                <button class="btn btn-sm btn-outline-info btn-logs" data-id="${u.id}" data-name="${u.username}">
                  <i class="bi bi-key"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${u.id}">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${u.id}">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>`;
    });

    applyRoleBasedUI();
  }

  async function loadUsers() {
    const res = await fetch(`${API_URL}/users.php`);
    const data = await res.json();
    renderUsers(data);
  }

  usersList.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.classList.contains('btn-edit')) editUser(id);
    if (btn.classList.contains('btn-delete')) deleteUser(id);
    if (btn.classList.contains('btn-logs')) viewLogs(id, btn.dataset.name);
  });

  formAdd.addEventListener('submit', async e => {
    e.preventDefault();

    const payload = {
      id: currentEditId,
      full_name: aName.value,
      username: aUser.value,
      email: aEmail.value,
      role: aRole.value,
      is_active: aActive.value,
      action: currentEditId ? 'update' : 'create',
      ...adminInfo
    };

    await fetch(`${API_URL}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    toastMsg.textContent = currentEditId ? 'User updated.' : 'User created.';
    toast.show();
    addModal.hide();
    formAdd.reset();
    currentEditId = null;
    loadUsers();
  });

  async function editUser(id) {
    const res = await fetch(`${API_URL}/users.php?id=${id}`);
    const u = await res.json();

    aName.value = u.full_name;
    aUser.value = u.username;
    aEmail.value = u.email;
    aRole.value = u.role;
    aActive.value = u.is_active;

    modalTitle.textContent = 'Edit User';
    currentEditId = id;
    addModal.show();
  }

  async function deleteUser(id) {
    if (!confirm('Deactivate this user?')) return;

    await fetch(`${API_URL}/users.php?id=${id}&admin_id=${adminInfo.admin_user_id}&admin_name=${encodeURIComponent(adminInfo.admin_user_name)}`, { method: 'DELETE' });

    toastMsg.textContent = 'User deactivated.';
    toast.show();
    loadUsers();
  }

  async function viewLogs(id, username) {
    logsModalTitle.textContent = `Login Activity for @${username}`;
    logsModalBody.innerHTML = 'Loading...';
    logsModal.show();

    const res = await fetch(`${API_URL}/user_logs.php?user_id=${id}`);
    const logs = await res.json();

    logsModalBody.innerHTML = logs.length
      ? `<ul class="list-group">${logs.map(l => `<li class="list-group-item">${new Date(l.login_time).toLocaleString()}</li>`).join('')}</ul>`
      : '<p class="text-muted">No activity.</p>';
  }

  document.getElementById('btnAddUser').addEventListener('click', () => {
    modalTitle.textContent = 'Add User';
    formAdd.reset();
    currentEditId = null;
  });

  loadUsers();
}
