// Session helpers
export function isLoggedIn(){ return localStorage.getItem('adm_logged') === '1'; }
export function login(){ localStorage.setItem('adm_logged','1'); }
export function logout(){ localStorage.removeItem('adm_logged'); }

// Guard to use on protected pages
export function guard(){ if (!isLoggedIn()) window.location.href = 'index.html'; }

// Logout wire-up (call with the button id)
export function wireLogout(btnId='btnLogout'){
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener('click', ()=> { logout(); window.location.href = 'index.html'; });
}

// Utils
export const fmtDate = (d)=> new Date(d).toLocaleString();
export function paginate(rows, page, per){
  const start = page * per;
  return { slice: rows.slice(start, start + per), start, total: rows.length };
}
