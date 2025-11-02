// This is the base URL for all your PHP API endpoints
export const API_URL = 'http://localhost/Barangay-Kiosk-Main/barangay-admin/api';

/**
 * Gets the currently logged-in user object from localStorage.
 * @returns {object | null} The parsed user object or null if not logged in.
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem('currentUser');
  if (!userJson) {
    return null;
  }
  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error('Failed to parse user data', e);
    localStorage.removeItem('currentUser'); // Clear corrupted data
    return null;
  }
}


export function guard() {
  const user = getCurrentUser();



  if (!user) {
    // Not logged in, redirect to login page
    location.href = 'index.html';
  }
}

/**
 * Checks if the current user has the 'Admin' role.
* @returns {boolean}
*/
export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'Admin';
}

/**
 * Checks if the current user has the 'Staff' role.
 * @returns {boolean}
 */
export function isStaff() {
  const user = getCurrentUser();
  return user && user.role === 'Staff';
}

/**
 * Attaches a click event to a logout button.
 * @param {string} buttonId The ID of the logout button.
 */
export function wireLogout(buttonId) {
  const logoutButton = document.getElementById(buttonId);
  if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      // Clear the user from localStorage
      localStorage.removeItem('currentUser');
      // Redirect to login
      location.href = 'index.html';
    });
  }
}

/**
 * Hides elements with the 'admin-only' class if the user is not an Admin.
* This should be called after the guard() on every page.
*/
export function applyRoleBasedUI() {
  if (isAdmin()) {
    // Admins see everything
    return;
  }
  
  // Not an admin, so hide all admin-only elements
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(el => {
    el.style.display = 'none';
  });
}
/**
 * Checks for new, unviewed requests and updates the sidebar badge.
 */
async function checkRequestNotifications() {
  const badge = document.getElementById('request-notification-badge');
  if (!badge) return; // Exit if badge element isn't on the page

  try {
    const response = await fetch(`${API_URL}/notification_check.php`);
    if (!response.ok) return; // Fail silently

    const data = await response.json();

    if (data.new_requests > 0) {
      // Show the badge and set the count
      badge.textContent = data.new_requests;
      badge.classList.remove('d-none');
    } else {
      // Hide the badge
      badge.classList.add('d-none');
    }

  } catch (error) {
    // Fail silently
    console.error('Notification check failed:', error);
  }
}

// Run the notification check as soon as the app.js file loads
checkRequestNotifications();
// And then re-check every 15 seconds
setInterval(checkRequestNotifications, 15000);

// ... (all your existing functions like getCurrentUser, guard, checkRequestNotifications, etc.) ...

/**
 * Wires up the "Requests" nav link to clear notifications on click.
 */
function wireRequestNotificationClear() {
  // Find the sidebar link for requests
  const requestLink = document.querySelector('aside.sidebar a[href="requests.html"]');
  const badge = document.getElementById('request-notification-badge');

  if (requestLink && badge) {
    requestLink.addEventListener('click', (e) => {
      // Check if the badge is currently visible
      if (!badge.classList.contains('d-none')) {
        
        // 1. Immediately hide the badge
        badge.classList.add('d-none');
        badge.textContent = '';

        // 2. Silently tell the server to mark all as read
        fetch(`${API_URL}/requests_mark_viewed.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        }).catch(error => console.error('Failed to mark notifications as read:', error));
        
        // Note: We don't 'await' the fetch. We let the user navigate
        // immediately while the server updates in the background.
      }
    });
  }
}

// Run this wiring logic as soon as the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireRequestNotificationClear);
} else {
    wireRequestNotificationClear(); // Run immediately if already loaded
}