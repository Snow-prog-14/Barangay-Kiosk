import { guard, wireLogout, applyRoleBasedUI, API_URL, isAppAdmin } from './app.js?v=3';

const currentUser = JSON.parse(localStorage.getItem('currentUser'));
const adminInfo = {
  admin_user_id: currentUser ? currentUser.id : 0,
  admin_user_name: currentUser ? currentUser.full_name : 'System'
};

guard();
wireLogout('btnLogout');
applyRoleBasedUI();
if (!isAppAdmin()) location.href = 'dashboard.html';

(function highlightSidebar() {
  const links = document.querySelectorAll('.sidebar .menu a');
  const current = location.pathname.split('/').pop();
  links.forEach(link => {
    link.parentElement.classList.toggle('active', link.getAttribute('href') === current);
  });
})();

const usersList = document.getElementById('usersList');
const formAdd = document.getElementById('formAdd');
const addModal = new bootstrap.Modal(mdlAdd);
const modalTitle = document.getElementById('mdlTitle');
const toast = new bootstrap.Toast(toastOk, { delay: 3000 });
const toastMsg = document.getElementById('toastMsg');
const tempPasswordModal = new bootstrap.Modal(mdlTempPassword);
const logsModal = new bootstrap.Modal(mdlUserLogs);
const logsModalTitle = document.getElementById('logsModalTitle');
const logsModalBody = document.getElementById('logsModalBody');

let currentEditId = null;

function renderUsers(users) {
  usersList.innerHTML = '';
  if (!users.length) {
    usersList.innerHTML = '<p class="text-center text-muted">No users found.</p>';
    return;
  }
  users.forEach(user => {
    usersList.innerHTML += `
      <div class="col-md-6 col-lg-4 mb-3">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5>${user.full_name}</h5>
            <small>@${user.username}</small>
            <span class="badge bg-secondary ms-2">${user.role}</span>
            <span class="badge ${user.is_active == 1 ? 'bg-success' : 'bg-danger'} ms-2">
              ${user.is_active == 1 ? 'Active' : 'Disabled'}
            </span>
            <div class="mt-3">
              <button class="btn btn-sm btn-outline-info btn-view-logs" data-id="${user.id}" data-username="${user.username}">
                <i class="bi bi-key"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${user.id}">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${user.id}">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>`;
  });
  applyRoleBasedUI();
}

async function fetchAndRenderUsers() {
  try {
    const res = await fetch(`${API_URL}/users.php`);
    const users = await res.json();
    renderUsers(users);
  } catch {
    usersList.innerHTML = '<p class="text-danger text-center">Failed to load users.</p>';
  }
}

usersList.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.classList.contains('btn-edit')) editUser(id);
  if (btn.classList.contains('btn-delete')) deleteUser(id);
  if (btn.classList.contains('btn-view-logs')) viewLogs(id, btn.dataset.username);
});

formAdd.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    id: currentEditId,
    full_name: aName.value,
    username: aUser.value,
    email: aEmail.value,
    role: aRole.value,
    is_active: aActive.value,
    ...adminInfo
  };

  const res = await fetch(`${API_URL}/users.php`, {
    method: currentEditId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) return alert('Save failed');

  toastMsg.textContent = currentEditId ? 'User updated.' : 'User created and email sent.';
  toast.show();
  addModal.hide();
  formAdd.reset();
  currentEditId = null;
  fetchAndRenderUsers();
});

async function editUser(id) {
  const u = await (await fetch(`${API_URL}/users.php?id=${id}`)).json();
  modalTitle.textContent = 'Edit User';
  aName.value = u.full_name;
  aUser.value = u.username;
  aEmail.value = u.email;
  aRole.value = u.role;
  aActive.value = u.is_active;
  currentEditId = id;
  addModal.show();
}

async function deleteUser(id) {
  if (!confirm('Deactivate this user?')) return;
  await fetch(`${API_URL}/users.php?id=${id}&admin_id=${adminInfo.admin_user_id}&admin_name=${encodeURIComponent(adminInfo.admin_user_name)}`, { method: 'DELETE' });
  toastMsg.textContent = 'User deactivated';
  toast.show();
  fetchAndRenderUsers();
}

async function viewLogs(id, username) {
  logsModalTitle.textContent = `Login Activity for @${username}`;
  logsModalBody.innerHTML = 'Loading...';
  logsModal.show();
  const logs = await (await fetch(`${API_URL}/user_logs.php?user_id=${id}`)).json();
  logsModalBody.innerHTML = logs.length
    ? `<ul class="list-group">${logs.map(l => `<li class="list-group-item">${new Date(l.login_time).toLocaleString()}</li>`).join('')}</ul>`
    : '<p class="text-muted">No activity.</p>';
}

document.getElementById('btnAddUser').addEventListener('click', () => {
  currentEditId = null;
  modalTitle.textContent = 'Add User';
  formAdd.reset();
});

fetchAndRenderUsers();
