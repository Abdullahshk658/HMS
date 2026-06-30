/**
 * SMARTDORMX - PROFILE PAGE JAVASCRIPT
 * Features: Clear all fields | Windows-style toast | Bottom-right position
===================================================== */

const CONFIG = {
  storageKey: 'smartdormx_profile',
  defaultAvatar: 'https://ui-avatars.com/api/?name=Nabeel+Ashraf&background=008080&color=fff&size=200'
};

let originalFormData = null;

// =====================
// INITIALIZATION
// =====================
document.addEventListener('DOMContentLoaded', () => {
  loadProfileData();
  setupEventListeners();
});

function setupEventListeners() {
  const form = document.getElementById('profileForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showConfirmModal('warning');
    });
  }

  // Clear errors on input/focus
  const fields = ['fullName', 'email', 'phone', 'gender', 'blood', 'city', 'cnic'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('focus', () => clearFieldError(id));
      el.addEventListener('input', () => clearFieldError(id));
    }
  });

  // CNIC auto-formatting
  const cnicInput = document.getElementById('cnic');
  if (cnicInput) {
    cnicInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^0-9]/g, '');
      if (value.length >= 5 && value.length < 13) {
        value = value.slice(0, 5) + '-' + value.slice(5);
      }
      if (value.length >= 13) {
        value = value.slice(0, 13) + '-' + value.slice(13, 14);
      }
      e.target.value = value.slice(0, 15);
    });
  }
}

// =====================
// VALIDATION
// =====================
function validateStepByStep() {
  clearAllErrors();

  const steps = [
    {
      id: 'fullName',
      required: true,
      msg: 'Full name is required (2-50 letters)',
      test: v => /^[a-zA-Z\s.'-]{2,50}$/.test(v)
    },
    {
      id: 'email',
      required: true,
      msg: 'Only Gmail addresses are accepted (e.g., user@gmail.com)',
      test: v => /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(v)
    },
    {
      id: 'phone',
      required: true,
      msg: 'Valid phone number is required (10-15 digits)',
      test: v => /^[+0-9\s()-]{10,15}$/.test(v)
    },
    {
      id: 'gender',
      required: true,
      msg: 'Please select a gender',
      test: v => v !== ''
    },
    {
      id: 'blood',
      required: false,
      msg: '',
      test: () => true
    },
    {
      id: 'city',
      required: true,
      msg: 'City is required',
      test: v => /^[a-zA-Z\s.-]{2,50}$/.test(v)
    },
    {
      id: 'cnic',
      required: true,
      msg: 'CNIC must be 13 digits (e.g., 12345-1234567-1)',
      test: v => v.replace(/[^0-9]/g, '').length === 13
    }
  ];

  for (const step of steps) {
    const input = document.getElementById(step.id);
    const errorEl = document.getElementById(`${step.id}Error`);
    if (!input) continue;

    const val = input.value.trim();

    if (step.required && val === '') {
      showFieldError(input, errorEl, step.msg);
      focusField(input);
      return false;
    }

    if (!step.required && val === '') continue;

    if (!step.test(val)) {
      showFieldError(input, errorEl, step.msg);
      focusField(input);
      return false;
    }
  }

  return true;
}

function showFieldError(input, errorEl, message) {
  input.classList.add('error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
  }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (input) input.classList.remove('error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}

function clearAllErrors() {
  const fields = ['fullName', 'email', 'phone', 'gender', 'blood', 'city', 'cnic'];
  fields.forEach(id => clearFieldError(id));
}

function focusField(input) {
  input.focus();
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// =====================
// MODAL FUNCTIONS
// =====================
function showConfirmModal(type = 'warning') {
  if (!validateStepByStep()) return;
  
  const modal = document.getElementById('confirmModal');
  const iconWrapper = document.getElementById('confirmIconWrapper');
  const icon = document.getElementById('confirmIcon');
  const title = document.getElementById('confirmTitle');
  const message = document.getElementById('confirmMessage');
  const confirmBtn = document.getElementById('confirmYesBtn');
  
  iconWrapper.classList.remove('warning', 'success', 'danger');
  
  switch(type) {
    case 'success':
      iconWrapper.classList.add('success');
      icon.className = 'fas fa-check-circle';
      title.textContent = 'Success!';
      confirmBtn.className = 'btn btn-success';
      break;
    case 'danger':
      iconWrapper.classList.add('danger');
      icon.className = 'fas fa-trash-alt';
      title.textContent = 'Delete Confirmation';
      confirmBtn.className = 'btn btn-danger';
      break;
    default:
      iconWrapper.classList.add('warning');
      icon.className = 'fas fa-exclamation-triangle';
      title.textContent = 'Save Changes?';
      message.textContent = 'Are you sure you want to save these changes to your profile?';
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
      confirmBtn.onclick = executeConfirm;
  }
  
  modal.classList.add('active');
}

function closeConfirm() {
  const modal = document.getElementById('confirmModal');
  if (modal) modal.classList.remove('active');
}

function executeConfirm() {
  handleSaveChanges();
  closeConfirm();
}

function closeModalOnOverlay(event, modalId) {
  if (event.target === document.getElementById(modalId)) {
    closeConfirm();
  }
}

// =====================
// SAVE CHANGES
// =====================
function handleSaveChanges() {
  if (!validateStepByStep()) return;

  const data = getCurrentFormData();
  data.lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
  originalFormData = { ...data };

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      icon: 'success',
      title: 'Profile Saved!',
      text: 'Your changes have been saved successfully.',
      timer: 1500,
      showConfirmButton: false
    }).then(() => {
      window.location.reload();
    });
  } else {
    showSuccessToast('Profile saved successfully!');
    setTimeout(() => window.location.reload(), 1000);
  }
}

// =====================
// ✅ DISCARD - CLEAR ALL FIELDS TO EMPTY
// =====================
function discardChanges() {
  // 🔥 CLEAR ALL FIELDS TO EMPTY (not reset to saved values)
  clearAllFields();
  
  // Show Windows-style toast notification
  showWindowsToast('All Fields Cleared', 'All form fields have been reset to empty');
}

// 🔥 Clear ALL form fields to empty
function clearAllFields() {
  const fieldsToClear = {
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    blood: '',
    city: '',
    cnic: ''
  };
  
  Object.entries(fieldsToClear).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
  
  // Clear errors too
  clearAllErrors();
  
  console.log('✅ All fields cleared to empty');
}

// 🪟 Windows-Style Toast Notification (like your screenshot)
function showWindowsToast(title, message) {
  // Remove existing toast
  const existing = document.getElementById('windowsToast');
  if (existing) existing.remove();
  
  // Create toast container
  const toast = document.createElement('div');
  toast.id = 'windowsToast';
  
  // Windows notification style
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    border-left: 4px solid #f59e0b;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
    padding: 16px;
    min-width: 320px;
    max-width: 400px;
    z-index: 10000;
    animation: slideUpFade 0.3s ease-out;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <!-- Warning Icon -->
      <div style="
        width: 32px;
        height: 32px;
        background: #fef3c7;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        <i class="fas fa-exclamation" style="color: #f59e0b; font-size: 14px;"></i>
      </div>
      
      <!-- Content -->
      <div style="flex: 1; min-width: 0;">
        <h4 style="
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          ${title}
          <span style="color: #6b7280; font-weight: 400;">∅</span>
        </h4>
        <p style="
          margin: 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        ">
          ${message}
        </p>
      </div>
      
      <!-- Close button -->
      <button onclick="this.closest('#windowsToast').remove()" style="
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
        flex-shrink: 0;
      " onmouseover="this.style.background='#f3f4f6'; this.style.color='#374151'" onmouseout="this.style.background='none'; this.style.color='#9ca3af'">
        <i class="fas fa-times" style="font-size: 12px;"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-dismiss after 2.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Success toast (for save confirmation)
function showSuccessToast(message) {
  const existing = document.getElementById('successToast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.id = 'successToast';
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e5e7eb;
    border-left: 4px solid #22c55e;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    padding: 16px;
    min-width: 320px;
    z-index: 10000;
    animation: slideUpFade 0.3s ease-out;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <div style="width: 32px; height: 32px; background: #f0fdf4; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <i class="fas fa-check" style="color: #22c55e; font-size: 14px;"></i>
      </div>
      <div style="flex: 1;">
        <p style="margin: 0; font-size: 14px; color: #111827; font-weight: 500;">${message}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add CSS animation
(function addToastAnimation() {
  if (document.getElementById('toastAnimStyle')) return;
  const style = document.createElement('style');
  style.id = 'toastAnimStyle';
  style.textContent = `
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
})();

// =====================
// DATA MANAGEMENT
// =====================
function loadProfileData() {
  const stored = localStorage.getItem(CONFIG.storageKey);
  let data = stored ? JSON.parse(stored) : getDefaultData();
  populateForm(data);
  originalFormData = { ...data };
}

function getDefaultData() {
  return {
    name: 'Nabeel Ashraf',
    email: '',
    phone: '+92 333 5788345',
    gender: '',
    blood_group: '',
    city: '',
    cnic: '',
    avatar: CONFIG.defaultAvatar
  };
}

function populateForm(data) {
  const fields = {
    fullName: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    gender: data.gender || '',
    blood: data.blood_group || '',
    city: data.city || '',
    cnic: data.cnic || ''
  };
  
  Object.entries(fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
  
  if (data.avatar) {
    document.getElementById('profileAvatar').src = data.avatar;
  }
  
  if (data.name) {
    document.getElementById('displayName').textContent = data.name;
    document.getElementById('adminName').textContent = data.name;
  }
  if (data.email) {
    document.querySelector('.profile-email').textContent = data.email;
  }
}

function getCurrentFormData() {
  return {
    name: document.getElementById('fullName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    gender: document.getElementById('gender').value,
    blood_group: document.getElementById('blood').value,
    city: document.getElementById('city').value.trim(),
    cnic: document.getElementById('cnic').value.trim(),
    avatar: document.getElementById('profileAvatar').src
  };
}

// =====================
// AVATAR UPLOAD
// =====================
function triggerAvatarUpload() {
  document.getElementById('avatarInput').click();
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showWindowsToast('Invalid File', 'Please select a valid image file');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showWindowsToast('File Too Large', 'Image must be less than 5MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('profileAvatar').src = e.target.result;
    showWindowsToast('Avatar Updated', 'Remember to save your changes');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// =====================
// KEYBOARD SHORTCUTS
// =====================
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    const form = document.getElementById('profileForm');
    if (form) form.requestSubmit();
  }
  
  if (e.key === 'Escape') {
    closeConfirm();
    document.activeElement?.blur();
    const toast = document.getElementById('windowsToast');
    if (toast) toast.remove();
  }
});

// =====================
// GLOBAL EXPORTS
// =====================
window.discardChanges = discardChanges;
window.clearAllFields = clearAllFields;
window.showConfirmModal = showConfirmModal;
window.closeConfirm = closeConfirm;
window.executeConfirm = executeConfirm;
window.closeModalOnOverlay = closeModalOnOverlay;
window.triggerAvatarUpload = triggerAvatarUpload;
window.handleAvatarUpload = handleAvatarUpload;
window.handleSaveChanges = handleSaveChanges;
window.showWindowsToast = showWindowsToast;
window.showSuccessToast = showSuccessToast;

