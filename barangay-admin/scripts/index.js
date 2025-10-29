// index page logic (login + show/hide password)
import { login, isLoggedIn } from './app.js';

// Redirect if already logged in
if (isLoggedIn()) window.location.href = 'dashboard.html';

// Demo credentials (replace with real API later)
const VALID_USER = 'Admin';
const VALID_PASS = 'Admin123';

// Elements
const form   = document.getElementById('loginForm');
const userEl = document.getElementById('u');
const passEl = document.getElementById('p');
const btn    = document.getElementById('btnSignIn');
const toggle = document.getElementById('togglePass');
const toastErr = new bootstrap.Toast(document.getElementById('toastErr'));

// Show/Hide password
toggle.addEventListener('click', () => {
  const show = passEl.type === 'password';
  passEl.type = show ? 'text' : 'password';
  toggle.innerHTML = show ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  passEl.focus();
});

// Submit handling
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.checkValidity()) { form.classList.add('was-validated'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Signing in...';

  const u = userEl.value.trim();
  const p = passEl.value;

  // Simulate quick auth (swap with fetch('/api/login.php', {method:'POST', body:...}))
  setTimeout(() => {
    if (u === VALID_USER && p === VALID_PASS) {
      // Remember me (optional)
      if (document.getElementById('remember').checked) {
        login(); // stores adm_logged=1 in localStorage
      } else {
        // For now keep simple guard using localStorage
        login();
      }
      window.location.href = 'dashboard.html';
    } else {
      btn.disabled = false;
      btn.innerHTML = '<span class="me-1"><i class="bi bi-box-arrow-in-right"></i></span> Sign in';
      toastErr.show();
    }
  }, 250);
});
