// Base URL for all PHP API endpoints
export const API_URL = 'https://andra-admin.barangay-ugong.com/barangay-admin/api';


/**
 * Gets the currently logged-in user object from localStorage.
 * @returns {object | null}
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('currentUser');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error('Failed to parse user data', e);
    localStorage.removeItem('currentUser');
    return null;
  }
}

/**
 * Guards protected pages.
 * Redirects to ROOT login page if not logged in.
 */
export function guard() {
  const user = getCurrentUser();

  if (!user) {
    location.href = 'index.html';
  }
}

/**
 * Role helpers
 */
export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role?.toLowerCase() === 'admin';
}

export function isStaff() {
  const user = getCurrentUser();
  return user && user.role?.toLowerCase() === 'staff';
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
    window.location.href = 'https://admin.barangay-ugong.com/';
  });
}

/**
 * Applies role-based UI visibility
 */
export function applyRoleBasedUI() {
  const user = getCurrentUser();

  document
    .querySelectorAll('.admin-only')
    .forEach(el => (el.style.display = 'none'));

  if (!user) {
    console.warn('No user found — hiding admin-only elements.');
    return;
  }

  const role = user.role?.trim().toLowerCase() || '';

  if (role === 'admin') {
    document
      .querySelectorAll('.admin-only')
      .forEach(el => (el.style.display = 'block'));
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
