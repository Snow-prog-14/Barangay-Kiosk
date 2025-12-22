// --- ADD THIS AT THE TOP of scripts/index.js ---
//
const API_URL = 'https://andra-admin.barangay-ugong.com/barangay-admin/api/auth.php';

//
// --- DELETE THESE OLD CONSTANTS ---
//
// const DEMO_ADMIN_USER = 'Admin', DEMO_ADMIN_PASS = 'Admin123';
// const DEMO_STAFF_USER = 'Staff', DEMO_STAFF_PASS = 'Staff123';


document.addEventListener('DOMContentLoaded', ()=> {
  const form = document.getElementById('loginForm');
  const inputU = document.getElementById('u');
  const inputP = document.getElementById('p');
  const toggleBtn = document.getElementById('togglePass');
  const toggleIcon = document.getElementById('toggleIcon');
  const toastEl = document.getElementById('toastErr');
  const toastErrMsgEl = document.getElementById('toastErrMsg'); // Get message element
  const toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3500 }) : null;
  const btnSignIn = document.getElementById('btnSignIn'); // Get button

  // Helper function to show toast
  const showToast = (message) => {
    if (toast && toastErrMsgEl) {
      toastErrMsgEl.textContent = message;
      toast.show();
    } else {
      alert(message);
    }
  };

  if (toggleBtn){
    toggleBtn.addEventListener('click', ()=>{
      if (inputP.type === 'password'){ inputP.type = 'text'; toggleIcon.className = 'bi bi-eye-slash'; }
      else { inputP.type = 'password'; toggleIcon.className = 'bi bi-eye'; }
      inputP.focus();
    });
  }

  if (!form) return;

  // REPLACED form.addEventListener with async version
  form.addEventListener('submit', async (ev)=> {
    ev.preventDefault();
    inputU.classList.remove('is-invalid'); inputP.classList.remove('is-invalid');

    const u = inputU.value.trim();
    const p = inputP.value;

    if (!u){ inputU.classList.add('is-invalid'); inputU.focus(); return; }
    if (!p){ inputP.classList.add('is-invalid'); inputP.focus(); return; }

    btnSignIn.disabled = true; // Disable button

    // START: Database-driven Authentication
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });

        const data = await response.json();

        // --- THIS BLOCK HAS BEEN REPLACED ---
        if (response.ok && data.status === 'success') {
            // SUCCESS
            localStorage.setItem('currentUser', JSON.stringify(data.user)); 

            // Check the password flag
            if (data.user.must_change_password) {
                // User MUST change their password
                location.href = '/barangay-admin/pages/force_change_password.html';

            } else {
                // Normal login
                location.href = '/barangay-admin/pages/dashboard.html';

            }
            return;
        } else {
        // --- END OF REPLACED BLOCK ---
            // FAILURE: Show error from API
            showToast(data.error || 'Invalid username or password.');
            inputU.classList.add('is-invalid');
            inputP.classList.add('is-invalid');
        }

    } catch (error) {
        console.error("Login API Error:", error);
        showToast('An error occurred. Check server connection.');
    } finally {
        btnSignIn.disabled = false; // Re-enable button
    }
    // END: Database-driven Authentication
  });

  inputU.focus();
});
