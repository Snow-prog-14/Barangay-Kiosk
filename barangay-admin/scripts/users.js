import { isStaff, guard, wireLogout, API_URL, getCurrentUser, applyRoleBasedUI } from './app.js';

// Role labels (UI)
const ROLE_LABEL = {
  staff: 'Staff',
  office_admin: 'Office Admins',
  app_admin: 'Application Admins',
};

let USERS = [];

// Normalize roles to new keys
function normalizeRole(role) {
  if (!role) return 'staff';
  const r = String(role).trim().toLowerCase();

  // old values -> new keys
  if (r === 'admin') return 'app_admin';
  if (r === 'kiosk') return 'office_admin';
  if (r === 'staff') return 'staff';

  // already new keys
  if (r === 'office_admin') return 'office_admin';
  if (r === 'app_admin') return 'app_admin';

  return 'staff';
}

// ✅ NEW: Force-sync the logged-in user's role from DB (fixes role stuck as "staff")
async function syncSessionUserFromDB() {
  const u = getCurrentUser();
  if (!u?.id) return;

  try {
    const res = await fetch(`${API_URL}/users.php?id=${u.id}`);
    if (!res.ok) return;

    const dbUser = await res.json();
    if (!dbUser) return;

    const updated = {
      ...u,
      id: dbUser.id,
      username: dbUser.username,
      full_name: dbUser.full_name,
      is_active: dbUser.is_active,
      role: normalizeRole(dbUser.role),
    };

    localStorage.setItem('currentUser', JSON.stringify(updated));
  } catch (err) {
    console.error('syncSessionUserFromDB failed:', err);
  }
}

// Admin info for logs
function getAdminInfo() {
  const currentUser = getCurrentUser();
  return {
    admin_user_id: currentUser ? currentUser.id : 0,
    admin_user_name: currentUser ? currentUser.full_name : 'System'
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  guard();
  wireLogout('btnLogout');

  // ✅ NEW: sync role BEFORE applying UI + rendering buttons
  await syncSessionUserFromDB();
  applyRoleBasedUI();

  await fetchUsers();

  const container = document.getElementById('usersList');
  if (container) renderUsersGrid(container);

  // Event delegation for buttons
  if (container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.edit) handleEditClick(btn.dataset.edit);
      if (btn.dataset.delete) handleDeleteClick(btn.dataset.delete);
      if (btn.dataset.logs) handleViewLogsClick(btn.dataset.logs, btn.dataset.username);
    });
  }

  // Form handler
  const form = document.getElementById('formAdd');
  if (form) form.addEventListener('submit', handleSubmit);
});

async function fetchUsers() {
  const res = await fetch(`${API_URL}/users.php`);
  USERS = await res.json();

  USERS.forEach(u => {
    u.role = normalizeRole(u.role);
    u.active = u.is_active == 1;
    u.name = u.full_name;
  });
}

// Render all users (THIS is where your 3 buttons were missing)
function renderUsersGrid(container) {
  container.innerHTML = (USERS || []).map(user => {
    const roleKey = normalizeRole(user.role);
    const roleText = ROLE_LABEL[roleKey] ?? roleKey;

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="mb-0 fw-semibold">${user.name}</h6>
                <div class="small text-muted">@${user.username}</div>
                <span class="badge bg-secondary mt-2">${roleText}</span>
              </div>
              <div class="text-end">
                <span class="badge ${user.active ? 'bg-success' : 'bg-danger'}">
                  ${user.active ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>

            <div class="mt-3 d-flex gap-2">
              ${isStaff() ? '' : `
                <button class="btn btn-sm btn-outline-info" title="View Login Activity"
                        data-logs="${user.id}" data-username="${user.username}">
                  <i class="bi bi-key"></i>
                </button>

                <button class="btn btn-sm btn-outline-secondary" title="Edit" data-edit="${user.id}">
                  <i class="bi bi-pencil"></i>
                </button>

                <button class="btn btn-sm btn-outline-danger" title="Archive" data-delete="${user.id}">
                  <i class="bi bi-trash"></i>
                </button>
              `}
            </div>

          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleEditClick(id) {
  try {
    const response = await fetch(`${API_URL}/users.php?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch user data');
    const user = await response.json();

    document.getElementById('mdlTitle').textContent = 'Edit User';
    document.getElementById('aName').value = user.full_name;
    document.getElementById('aUser').value = user.username;
    document.getElementById('aEmail').value = user.email ?? '';
    document.getElementById('aRole').value = normalizeRole(user.role);
    document.getElementById('aActive').value = user.is_active;

    document.getElementById('formAdd').dataset.editId = id;
    new bootstrap.Modal(document.getElementById('mdlAdd')).show();
  } catch (error) {
    console.error('Edit Error:', error);
    alert('Could not load user data.');
  }
}

async function handleSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const editId = form.dataset.editId || null;

  const payload = {
    id: editId,
    full_name: document.getElementById('aName').value.trim(),
    username: document.getElementById('aUser').value.trim(),
    email: document.getElementById('aEmail').value.trim(),
    role: document.getElementById('aRole').value,
    is_active: document.getElementById('aActive').value,
    ...getAdminInfo()
  };

  if (!payload.full_name || !payload.username || !payload.email || !payload.role) return;

  try {
    // Use POST always, override to PUT when editing
    const headers = { 'Content-Type': 'application/json' };
    if (editId) headers['X-HTTP-Method-Override'] = 'PUT';

    const response = await fetch(`${API_URL}/users.php`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to save user');

    showToast(editId ? 'User updated successfully.' : 'User created successfully.');

    const modal = bootstrap.Modal.getInstance(document.getElementById('mdlAdd'));
    modal.hide();
    form.reset();
    delete form.dataset.editId;

    await fetchUsers();
    renderUsersGrid(document.getElementById('usersList'));
  } catch (error) {
    console.error('Submit Error:', error);
    alert(error.message);
  }
}

async function handleDeleteClick(id) {
  if (!confirm('Are you sure you want to archive this user?')) return;

  try {
    const admin = getAdminInfo();
    const url = `${API_URL}/users.php?id=${id}&admin_id=${admin.admin_user_id}&admin_name=${encodeURIComponent(admin.admin_user_name)}`;

    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to archive user');

    showToast('User archived successfully.');

    await fetchUsers();
    renderUsersGrid(document.getElementById('usersList'));
  } catch (error) {
    console.error('Delete Error:', error);
    alert(error.message);
  }
}

async function handleViewLogsClick(userId, username) {
  const logsModalTitle = document.getElementById('logsModalTitle');
  const logsModalBody = document.getElementById('logsModalBody');

  logsModalTitle.textContent = `Login Activity for @${username}`;
  logsModalBody.innerHTML = '<p>Loading logs...</p>';

  new bootstrap.Modal(document.getElementById('mdlUserLogs')).show();

  try {
    const response = await fetch(`${API_URL}/user_logs.php?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch logs');

    const logs = await response.json();

    if (!logs.length) {
      logsModalBody.innerHTML = '<p class="text-muted">No login activity found for this user.</p>';
      return;
    }

    let logList = '<ul class="list-group">';
    logs.forEach(log => {
      logList += `<li class="list-group-item">Logged in at: ${new Date(log.login_time).toLocaleString()}</li>`;
    });
    logList += '</ul>';
    logsModalBody.innerHTML = logList;
  } catch (error) {
    console.error('Log Fetch Error:', error);
    logsModalBody.innerHTML = '<p class="text-danger">An error occurred while fetching logs.</p>';
  }
}

function showToast(message) {
  const toastEl = document.getElementById('toastOk');
  document.getElementById('toastMsg').textContent = message;
  new bootstrap.Toast(toastEl).show();
}
