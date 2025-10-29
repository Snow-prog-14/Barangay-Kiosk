// scripts/app.js
export function getRole(){ return sessionStorage.getItem('brgy_role') || null; }
export function isStaff(){ return getRole() === 'Staff'; }
export function isAdmin(){ return getRole() === 'Admin'; }

export function guard(allowAny=false){
  const role = getRole();
  if(!role && !allowAny){ location.href = './index.html'; return false; }

  // hide admin-only items for staff
  hideAdminControls();

  const who = document.getElementById('whoRole');
  if(who) who.textContent = role;
  return true;
}

export function wireLogout(btnId){
  const b = document.getElementById(btnId);
  if(!b) return;
  b.addEventListener('click', ()=>{
    sessionStorage.removeItem('brgy_role');
    localStorage.removeItem('brgy_auth_demo');
    location.href = './index.html';
  });
}

export function hideAdminControls(){
  if(isStaff()){
    document.querySelectorAll('.admin-only').forEach(el => el.remove());
  }
}

// Formatting helper
export function fmtDate(iso){
  try{
    const d = new Date(iso);
    if(isNaN(d)) return iso || '—';
    return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch { return iso || '—'; }
}

export function paginate(arr, page, per){
  const total = arr.length;
  const start = page * per;
  const slice = arr.slice(start, start+per);
  return { slice, start, total };
}
