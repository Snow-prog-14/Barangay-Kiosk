// scripts/index.js
// Login page: supports Admin/Admin123 and Staff/Staff123 (demo only)

const DEMO_ADMIN_USER = 'Admin', DEMO_ADMIN_PASS = 'Admin123';
const DEMO_STAFF_USER = 'Staff', DEMO_STAFF_PASS = 'Staff123';

document.addEventListener('DOMContentLoaded', ()=> {
  const form = document.getElementById('loginForm');
  const inputU = document.getElementById('u');
  const inputP = document.getElementById('p');
  const toggleBtn = document.getElementById('togglePass');
  const toggleIcon = document.getElementById('toggleIcon');
  const toastEl = document.getElementById('toastErr');
  const toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3500 }) : null;

  if (toggleBtn){
    toggleBtn.addEventListener('click', ()=>{
      if (inputP.type === 'password'){ inputP.type = 'text'; toggleIcon.className = 'bi bi-eye-slash'; }
      else { inputP.type = 'password'; toggleIcon.className = 'bi bi-eye'; }
      inputP.focus();
    });
  }

  if (!form) return;

  form.addEventListener('submit', (ev)=> {
    ev.preventDefault();
    inputU.classList.remove('is-invalid'); inputP.classList.remove('is-invalid');

    const u = inputU.value.trim();
    const p = inputP.value;

    if (!u){ inputU.classList.add('is-invalid'); inputU.focus(); return; }
    if (!p){ inputP.classList.add('is-invalid'); inputP.focus(); return; }

    // Admin
    if (u === DEMO_ADMIN_USER && p === DEMO_ADMIN_PASS){
      sessionStorage.setItem('brgy_role', 'Admin');
      if (document.getElementById('remember') && document.getElementById('remember').checked) localStorage.setItem('brgy_auth_demo','1');
      location.href = './dashboard.html';
      return;
    }

    // Staff
    if (u === DEMO_STAFF_USER && p === DEMO_STAFF_PASS){
      sessionStorage.setItem('brgy_role', 'Staff');
      location.href = './dashboard.html';
      return;
    }

    if (toast){
      document.getElementById('toastErrMsg').textContent = 'Invalid username or password.';
      toast.show();
    } else {
      alert('Invalid username or password.');
    }
  });

  inputU.focus();
});
