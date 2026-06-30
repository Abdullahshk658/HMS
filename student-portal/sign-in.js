const VALID_EMAIL = "B22F0403CS046@fecid.edu.pk";
    const VALID_PASS  = "Password123";
    const STORAGE_KEY = "smartdormx_remembered";

    window.addEventListener('DOMContentLoaded', () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.email && data.pass) {
                    document.getElementById('emailInput').value    = data.email;
                    document.getElementById('passwordInput').value = data.pass;
                    document.getElementById('rememberMe').checked  = true;
                    document.getElementById('rememberedNotice').style.display = 'block';
                }
            } catch(e) { localStorage.removeItem(STORAGE_KEY); }
        }
    });

    const eyeBtn  = document.getElementById('eyeBtn');
    const pwField = document.getElementById('passwordInput');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOpen   = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    const eyeClosed = `<line x1="1" y1="1" x2="23" y2="23"/><path d="M9.88 9.88a3 3 0 104.24 4.24M6.14 6.14C3.56 7.86 1 12 1 12s4 8 11 8a11 11 0 005.05-1.16M10 4.07A10 10 0 0123 12a11 11 0 01-4.3 5.11"/>`;
    eyeBtn.addEventListener('click', () => {
        const isPass = pwField.type === 'password';
        pwField.type = isPass ? 'text' : 'password';
        eyeIcon.innerHTML = isPass ? eyeClosed : eyeOpen;
    });

    function handleLogin() {
        const emailVal = document.getElementById('emailInput').value.trim();
        const passVal  = document.getElementById('passwordInput').value;
        const remember = document.getElementById('rememberMe').checked;
        const btn      = document.getElementById('signInBtn');
        const errDiv   = document.getElementById('errorMsg');
        const emailEl  = document.getElementById('emailInput');
        const passEl   = document.getElementById('passwordInput');

        errDiv.style.display = 'none';
        emailEl.classList.remove('error-field');
        passEl.classList.remove('error-field');

        if (emailVal === VALID_EMAIL && passVal === VALID_PASS) {
            if (remember) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: emailVal, pass: passVal }));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
            btn.classList.add('loading');
            btn.innerHTML = `<div class="spinner"></div> Authenticating…`;
            setTimeout(() => { window.location.href = "std-dashboard.html"; }, 1500);
        } else {
            errDiv.textContent   = "Invalid email or password. Please try again.";
            errDiv.style.display = 'block';
            emailEl.classList.add('error-field');
            passEl.classList.add('error-field');
            btn.classList.add('shake');
            setTimeout(() => btn.classList.remove('shake'), 500);
        }
    }

    document.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

    function openModal()  { document.getElementById('modal').classList.add('active'); }
    function closeModal() { document.getElementById('modal').classList.remove('active'); }
    function handleOverlayClick(e) {
        if (e.target === document.getElementById('modal')) closeModal();
    }