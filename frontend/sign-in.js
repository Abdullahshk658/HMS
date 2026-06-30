/**
 * SmartDormX — Sign In Logic
 * sign-in.js
 */

/* =============================================
   CONFIG
   ============================================= */
   const VALID_USERNAME = "paf-iast@admin.org"; // demo: any credentials work
   const VALID_PASSWORD = "Password123"; // demo: any credentials work
   const STORAGE_KEY    = "sdx_remember";
   
   /* =============================================
      DOM REFERENCES
      ============================================= */
   const usernameField = document.getElementById('usernameField');
   const passwordField = document.getElementById('passwordField');
   const rememberChk   = document.getElementById('rememberMe');
   const eyeBtn        = document.getElementById('eyeBtn');
   const eyeIcon       = document.getElementById('eyeIcon');
   const loginBtn      = document.getElementById('loginBtn');
   const btnText       = document.getElementById('btnText');
   const btnSpinner    = document.getElementById('btnSpinner');
   const errorMsg      = document.getElementById('errorMsg');
   const successMsg    = document.getElementById('successMsg');
   const forgotLink    = document.getElementById('forgotLink');
   const modalOverlay  = document.getElementById('modalOverlay');
   const closeModalBtn = document.getElementById('closeModal');
   const okModalBtn    = document.getElementById('okModal');
   
   /* =============================================
      1. AUTO-FILL ON PAGE LOAD (Remember Me)
      ============================================= */
   window.addEventListener('DOMContentLoaded', () => {
       const saved = getSavedCredentials();
       if (saved) {
           usernameField.value = saved.username;
           passwordField.value = saved.password;
           rememberChk.checked = true;
           showAlert(successMsg, 'Welcome back! Credentials auto-filled.');
           setTimeout(() => hideAlert(successMsg), 3000);
       }
   });
   
   function getSavedCredentials() {
       try {
           const raw = localStorage.getItem(STORAGE_KEY);
           return raw ? JSON.parse(raw) : null;
       } catch {
           return null;
       }
   }
   
   function saveCredentials(username, password) {
       localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, password }));
   }
   
   function clearCredentials() {
       localStorage.removeItem(STORAGE_KEY);
   }
   
   /* =============================================
      2. PASSWORD EYE TOGGLE
      ============================================= */
   eyeBtn.addEventListener('click', () => {
       const isPassword = passwordField.type === 'password';
       passwordField.type = isPassword ? 'text' : 'password';
   
       // Update SVG icon paths
       eyeIcon.innerHTML = isPassword
           ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
           : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
   });
   
   /* =============================================
      3. LOGIN HANDLER
      ============================================= */
   loginBtn.addEventListener('click', handleLogin);
   
   // Allow Enter key to submit from either field
   [usernameField, passwordField].forEach(el => {
       el.addEventListener('keydown', e => {
           if (e.key === 'Enter') handleLogin();
       });
   });
   
   function handleLogin() {
       const username = usernameField.value.trim();
       const password = passwordField.value;
   
       // Clear previous states
       hideAlert(errorMsg);
       hideAlert(successMsg);
       clearFieldErrors();
   
       // Validation
       if (!username || !password) {
           showAlert(errorMsg, 'Please enter both username and password.');
           if (!username) setFieldError(usernameField);
           if (!password) setFieldError(passwordField);
           return;
       }
   
       // Credential Check
       // Demo mode: accept any non-empty credentials
    if (username && password) {
           // Handle Remember Me
           if (rememberChk.checked) {
               saveCredentials(username, password);
           } else {
               clearCredentials();
           }
   
           // Loading State
           setLoading(true);
   
           // Simulate server request
           setTimeout(() => {
               setLoading(false);
               showAlert(successMsg, 'Access granted! Redirecting...');
               setTimeout(() => {
                   window.location.href = 'dashboard.html'; // ← Change to your actual dashboard URL
               }, 1000);
           }, 1500);
   
       } else {
           showAlert(errorMsg, 'Invalid username or password.');
           setFieldError(usernameField);
           setFieldError(passwordField);
       }
   }
   
   /* =============================================
      4. FORGOT PASSWORD MODAL
      ============================================= */
   forgotLink.addEventListener('click', (e) => {
       e.preventDefault();
       modalOverlay.classList.add('open');
   });
   
   function closeModal() {
       modalOverlay.classList.remove('open');
   }
   
   closeModalBtn.addEventListener('click', closeModal);
   okModalBtn.addEventListener('click', closeModal);
   
   // Close when clicking outside the modal
   modalOverlay.addEventListener('click', (e) => {
       if (e.target === modalOverlay) closeModal();
   });
   
   // Close with Escape key
   document.addEventListener('keydown', (e) => {
       if (e.key === 'Escape') closeModal();
   });
   
   /* =============================================
      HELPERS
      ============================================= */
   function setLoading(isLoading) {
       if (isLoading) {
           loginBtn.classList.add('loading');
           btnText.textContent = 'Authenticating...';
           btnSpinner.style.display = 'inline-block';
           loginBtn.disabled = true;
       } else {
           loginBtn.classList.remove('loading');
           btnText.textContent = 'Sign In';
           btnSpinner.style.display = 'none';
           loginBtn.disabled = false;
       }
   }
   
   function showAlert(element, message) {
       element.textContent = message;
       element.style.display = 'block';
   }
   
   function hideAlert(element) {
       element.style.display = 'none';
       element.textContent = '';
   }
   
   function setFieldError(input) {
       input.classList.add('error-field');
       // Remove error styling on next typing
       input.addEventListener('input', () => input.classList.remove('error-field'), { once: true });
   }
   
   function clearFieldErrors() {
       usernameField.classList.remove('error-field');
       passwordField.classList.remove('error-field');
   }