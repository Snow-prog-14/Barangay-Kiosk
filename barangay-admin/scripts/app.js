// scripts/app.js
// Shared helpers, role management, and small UI utilities.

export function getRole() {
  return sessionStorage.getItem('brgy_role') || null;
}

export function isStaff() { return getRole() === 'Staff'; }
export function isAdmin() { return getRole() === 'Admin'; }

// Guard: require login and adjust UI
export function guard(allowAny = false) {
  const role = getRole();
  if (!role && !allowAny) {
    location.href = './index.html';
    return false;
  }

  // show role in topbar element if present
  const who = document.getElementById('whoRole');
  if (who) who.textContent = role;

  // hide admin-only elements when staff
  hideAdminControls();
  return true;
}

export function wireLogout(btnId) {
  const b = document.getElementById(btnId);
  if (!b) return;
  b.addEventListener('click', () => {
    sessionStorage.removeItem('brgy_role');
    localStorage.removeItem('brgy_auth_demo');
    location.href = './index.html';
  });
}

export function hideAdminControls(){
  if (isStaff()){
    // Remove only elements NOT meant for staff
    document.querySelectorAll('.admin-only:not(.staff-visible)').forEach(el => el.remove());

    // Also hide dropdowns not for staff
    const dd = document.querySelectorAll('.admin-dropdown-hide');
    dd.forEach(el => el.style.display = 'none');
  }
}


/* ----------------- small helpers ----------------- */

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d)) return iso || '—';
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso || '—'; }
}

/** paginate(array, pageIndex, perPage) -> { slice, start, total } */
export function paginate(arr, page, per) {
  const total = arr.length;
  const start = page * per;
  const slice = arr.slice(start, start + per);
  return { slice, start, total };
}
