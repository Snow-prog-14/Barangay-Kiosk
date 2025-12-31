// Base URL for all PHP API endpoints
export const API_URL = 'https://emil-admin.barangay-ugong.com/barangay-admin/api';


/**
 * Gets the currently logged-in user object from localStorage.
 * @returns {object | null}
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('currentUser');
  if (!userJson) return null;

  try {
    const u = JSON.parse(userJson);
    u.role = normalizeRole(u.role);
    return u;

  } catch (e) {
    localStorage.removeItem('currentUser');
    return null;
  }
}

function normalizeRole(role) {
  if (!role) return 'staff';
  const r = String(role).trim().toLowerCase();

  // ✅ Accept old role values
  if (r === 'admin') return 'app_admin';
  if (r === 'kiosk') return 'office_admin';
  if (r === 'staff') return 'staff';

  // ✅ Accept new keys
  if (r === 'office_admin') return 'office_admin';
  if (r === 'app_admin') return 'app_admin';

  // ✅ Accept label values coming from backend/UI
  // (These were being forced to "staff" before)
  if (r === 'application admins' || r === 'application admin' || r === 'app admins' || r === 'app admin') return 'app_admin';
  if (r === 'office admins' || r === 'office admin') return 'office_admin';

  // Unknown -> default
  return 'staff';
}

function normalizeSessionRole(r) {
  if (!r) return 'staff';
  r = String(r).toLowerCase().trim();
  if (r === 'admin') return 'app_admin';
  if (r === 'kiosk') return 'office_admin';

  // ✅ keep consistent normalization here too
  if (r === 'application admins' || r === 'application admin' || r === 'app admins' || r === 'app admin') return 'app_admin';
  if (r === 'office admins' || r === 'office admin') return 'office_admin';

  return r;
}

/**
 * Guards protected pages.
 * Redirects to ROOT login page if not logged in.
 */
export function guard() {
  const user = getCurrentUser();
  if (!user) {
    location.href = '/index.html';
  }
}


/**
 * Role helpers
 */
export function isAdmin() {
  const u = getCurrentUser();
  if (!u) return false;
  return u.role === 'app_admin' || u.role === 'office_admin';
}

export function isStaff() {
  const u = getCurrentUser();
  const role = normalizeRole(u?.role);
  return role === 'staff';
}


/**
 * Logout handler
 */
export function wireLogout(buttonId) {
  const logoutButton = document.getElementById(buttonId);
  if (!logoutButton) return;

  logoutButton.addEventListener('click', (e) => {
    e.preventDefault();

    localStorage.removeItem('currentUser');

    // Redirect to admin login root
    window.location.href = 'https://emil-admin.barangay-ugong.com/index.html';
  });
}


/**
 * Applies role-based UI visibility
 */
export function applyRoleBasedUI() {
  const u = getCurrentUser();
  const role = (u?.role || 'staff').toLowerCase();

  // Reset everything
  document.querySelectorAll('.public-only,.admin-only,.app-admin-only')
    .forEach(el => el.style.display = 'none');

  // Everyone sees public items
  document.querySelectorAll('.public-only')
    .forEach(el => el.style.display = '');

  // Office + App admins see admin items
  if (role === 'office_admin' || role === 'app_admin') {
    document.querySelectorAll('.admin-only')
      .forEach(el => el.style.display = '');
  }

  // App admin only
  if (role === 'app_admin') {
    document.querySelectorAll('.app-admin-only')
      .forEach(el => el.style.display = '');
  }
}


/**
 * Notification check
 */
async function checkRequestNotifications() {
  const badge = document.getElementById('request-notification-badge');
  if (!badge) return;

  try {
    const response = await fetch(`${API_URL}/notification_check.php`);
    if (!response.ok) return;

    const data = await response.json();

    if (data.new_requests > 0) {
      badge.textContent = data.new_requests;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  } catch (error) {
    console.error('Notification check failed:', error);
  }
}

// Run notification checks
checkRequestNotifications();
setInterval(checkRequestNotifications, 15000);

/**
 * Clears request notification badge on click
 */
function wireRequestNotificationClear() {
  const requestLink = document.querySelector(
    'aside.sidebar a[href="requests.html"]'
  );
  const badge = document.getElementById('request-notification-badge');

  if (!requestLink || !badge) return;

  requestLink.addEventListener('click', () => {
    if (badge.classList.contains('d-none')) return;

    badge.classList.add('d-none');
    badge.textContent = '';

    fetch(`${API_URL}/requests_mark_viewed.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err =>
      console.error('Failed to mark notifications as read:', err)
    );
  });
}

// DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wireRequestNotificationClear);
} else {
  wireRequestNotificationClear();
}
