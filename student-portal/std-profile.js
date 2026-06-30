/**
 * SmartDormX - Student Profile Page
 * ✅ Stylish confirmation modal
 * ✅ Password requirements in toast
 * ✅ Discard clears all form fields
 * ✅ Real-time validation
 */

// ═══════════════════════════════════════════
// STORAGE CONFIGURATION
// ═══════════════════════════════════════════

const StorageKeys = {
  STUDENT_PROFILE: 'sd_student_profile',
  AUTH_TOKEN: 'sd_auth_token'
};

const defaultProfile = {
  firstName: 'Fahad',
  lastName: 'Ali',
  cnic: '35202-1234567-1',
  dateOfBirth: '2002-05-15',
  phone: '03001234567',
  email: 'fahad.cs082@gmail.com',
  gender: 'Male',
  bloodGroup: 'O+',
  guardianName: 'Muhammad Ali',
  guardianPhone: '03009876543',
  disability: 'No',
  disabilitySpec: '',
  address: 'House 123, Street 45, Gulberg, Lahore',
  city: 'Lahore',
  postalCode: '54000',
  country: 'Pakistan',
  joiningDate: '2022-09-01',
  avatar: 'https://ui-avatars.com/api/?background=3b82f6&color=fff&name=Fahad+Ali',
  lastUpdated: new Date().toISOString()
};

// ═══════════════════════════════════════════
// STORAGE UTILITIES
// ═══════════════════════════════════════════

const Storage = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  init() {
    if (!this.get(StorageKeys.STUDENT_PROFILE)) {
      this.set(StorageKeys.STUDENT_PROFILE, defaultProfile);
    }
  }
};

Storage.init();

// ═══════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════

function showToast(message, type = 'info', duration = 5000) {
  const existing = document.querySelector('.custom-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  
  const icons = {
    info: 'fa-info-circle',
    success: 'fa-check-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle'
  };
  
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${icons[type]}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showPasswordRequirementsToast() {
  const requirements = `
    <div style="font-weight: 600; margin-bottom: 8px;">Password Requirements:</div>
    <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
      <li>At least 6 characters</li>
      <li>One uppercase letter (A-Z)</li>
      <li>One number (0-9)</li>
      <li>One special character (!@#$%^&*)</li>
    </ul>
  `;
  showToast(requirements, 'info', 8000);
}

// ═══════════════════════════════════════════
// STYLISH CONFIRMATION MODAL
// ═══════════════════════════════════════════

function showConfirmModal(title, message, onConfirm) {
  const modal = document.createElement('div');
  modal.className = 'confirm-modal-overlay';
  modal.innerHTML = `
    <div class="confirm-modal">
      <div class="confirm-modal-header">
        <div class="confirm-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3>${title}</h3>
      </div>
      <div class="confirm-modal-body">
        <p>${message}</p>
      </div>
      <div class="confirm-modal-footer">
        <button class="confirm-btn cancel" onclick="this.closest('.confirm-modal-overlay').remove()">
          <i class="fas fa-times"></i> Cancel
        </button>
        <button class="confirm-btn confirm" id="confirmModalAction">
          <i class="fas fa-check"></i> Confirm
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add animation
  setTimeout(() => {
    modal.querySelector('.confirm-modal').style.transform = 'scale(1)';
    modal.querySelector('.confirm-modal').style.opacity = '1';
  }, 10);
  
  // Handle confirm button
  modal.querySelector('#confirmModalAction').addEventListener('click', () => {
    modal.remove();
    if (onConfirm) onConfirm();
  });
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// ═══════════════════════════════════════════
// PASSWORD VALIDATION
// ═══════════════════════════════════════════

function validatePassword(pwd) {
  const rules = {
    length: pwd.length >= 6,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)
  };
  return {
    valid: rules.length && rules.uppercase && rules.number && rules.special,
    rules
  };
}

// ═══════════════════════════════════════════
// FORM VALIDATION UTILITIES
// ═══════════════════════════════════════════

const Validators = {
  required: v => v && v.trim() !== '',
  minLength: (v, len) => v && v.length >= len,
  maxLength: (v, len) => !v || v.length <= len,
  email: v => /^[^@]+@gmail\.com$/.test(v),
  phone: v => /^[0-9]{10,15}$/.test(v),
  cnic: v => /^\d{5}-\d{7}-\d{1}$/.test(v),
  postalCode: v => /^\d{5}$/.test(v),
  date: v => !v || !isNaN(new Date(v).getTime())
};

function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = field?.closest('.input-field')?.querySelector('.error-msg');
  if (field) field.classList.add('error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = field?.closest('.input-field')?.querySelector('.error-msg');
  if (field) field.classList.remove('error');
  if (errorEl) errorEl.style.display = 'none';
}

function validateField(fieldId, rules) {
  const field = document.getElementById(fieldId);
  if (!field) return false;
  
  const value = field.value.trim();
  let isValid = true;
  
  for (const rule of rules) {
    if (!rule.validator(value, rule.param)) {
      isValid = false;
      break;
    }
  }
  
  if (isValid) {
    clearError(fieldId);
  }
  
  return isValid;
}

function validateForm() {
  let valid = true;
  
  const requiredFields = [
    { id: 'firstName', rules: [{ validator: Validators.required }, { validator: Validators.minLength, param: 3 }], msg: 'Enter first name (min 3 characters)' },
    { id: 'lastName', rules: [{ validator: Validators.required }, { validator: Validators.minLength, param: 3 }], msg: 'Enter last name (min 3 characters)' },
    { id: 'cnic', rules: [{ validator: Validators.required }, { validator: Validators.cnic }], msg: 'Enter valid CNIC (format: XXXXX-XXXXXXX-X)' },
    { id: 'phone', rules: [{ validator: Validators.required }, { validator: Validators.phone }], msg: 'Enter valid phone number (min 10 digits)' },
    { id: 'email', rules: [{ validator: Validators.required }, { validator: Validators.email }], msg: 'Enter valid Gmail address' },
    { id: 'gender', rules: [{ validator: Validators.required }], msg: 'Select gender' },
    { id: 'bloodGroup', rules: [{ validator: Validators.required }], msg: 'Select blood group' },
    { id: 'guardianName', rules: [{ validator: Validators.required }, { validator: Validators.minLength, param: 3 }], msg: 'Enter guardian name (min 3 characters)' },
    { id: 'guardianPhone', rules: [{ validator: Validators.required }, { validator: Validators.phone }], msg: 'Enter valid phone number (min 10 digits)' },
    { id: 'address', rules: [{ validator: Validators.required }, { validator: Validators.minLength, param: 10 }], msg: 'Enter complete address (min 10 characters)' },
    { id: 'city', rules: [{ validator: Validators.required }, { validator: Validators.minLength, param: 2 }], msg: 'Enter city name' },
    { id: 'postalCode', rules: [{ validator: Validators.required }, { validator: Validators.postalCode }], msg: 'Enter valid postal code (5 digits)' },
    { id: 'country', rules: [{ validator: Validators.required }, { validator: Validators.minLength, param: 2 }], msg: 'Enter country name' },
    { id: 'joiningDate', rules: [{ validator: Validators.required }, { validator: Validators.date }], msg: 'Select joining date' }
  ];
  
  requiredFields.forEach(field => {
    if (!validateField(field.id, field.rules)) {
      showError(field.id, field.msg);
      valid = false;
    }
  });
  
  // Conditional: Disability details
  const disability = document.getElementById('disability')?.value;
  if (disability === 'Yes') {
    if (!validateField('disabilitySpec', [{ validator: Validators.required }])) {
      showError('disabilitySpec', 'Enter disability details');
      valid = false;
    }
  }
  
  return valid;
}

// ═══════════════════════════════════════════
// UI FUNCTIONS
// ═══════════════════════════════════════════

function formatCNIC(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5);
  if (value.length > 13) value = value.slice(0, 13) + '-' + value.slice(13, 14);
  input.value = value;
  // Clear error if format is now valid
  if (/^\d{5}-\d{7}-\d{1}$/.test(value)) clearError('cnic');
}

function toggleDisabilityField() {
  const disability = document.getElementById('disability')?.value;
  const specField = document.getElementById('disabilitySpecField');
  if (specField) {
    specField.style.display = disability === 'Yes' ? 'block' : 'none';
  }
}

// 🔹 REPLACE THIS IN std-profile.js
async function loadProfile() {
  try {
    // Get current student's registration number (from session or default)
    const regNo = sessionStorage.getItem('student_reg_no') || 'B22F0403CS046'; // 🔧 Replace with real session logic later
    
    // Fetch from Supabase
    const { data, error } = await window.studentSupabase
      .from('students')
      .select('*')
      .eq('reg_no', regNo)
      .single();
      
    if (error) {
      console.warn('⚠️ Falling back to localStorage for profile');
      // Fallback to localStorage if DB fails
      const localProfile = localStorage.getItem('sd_student_profile');
      if (localProfile) {
        const profile = JSON.parse(localProfile);
        fillProfileForm(profile);
        return;
      }
    }
    
    if (data) {
      // Map DB columns to your form IDs
      const profile = {
        firstName: data.first_name,
        lastName: data.last_name,
        cnic: data.cnic || '',
        dateOfBirth: data.date_of_birth || '',
        phone: data.phone,
        email: data.email,
        gender: data.gender,
        bloodGroup: data.blood_group,
        guardianName: data.guardian_name,
        guardianPhone: data.guardian_phone,
        disability: data.disability || 'No',
        disabilitySpec: data.disability_details || '',
        address: data.address,
        city: data.city,
        postalCode: data.postal_code || '',
        country: data.country || 'Pakistan',
        joiningDate: data.joining_date || '',
        avatar: data.photo_url || `https://ui-avatars.com/api/?background=3b82f6&color=fff&name=${data.first_name}+${data.last_name}`,
        lastUpdated: data.updated_at
      };
      fillProfileForm(profile);
    }
  } catch (err) {
    console.error('❌ Error loading profile:', err);
  }
}

// 🔹 NEW HELPER: Fill form fields
function fillProfileForm(profile) {
  const fields = ['firstName','lastName','cnic','dateOfBirth','phone','email','gender','bloodGroup','guardianName','guardianPhone','disability','disabilitySpec','address','city','postalCode','country','joiningDate'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && profile[id] !== undefined) el.value = profile[id];
  });
  
  const avatar = document.getElementById('profileAvatar');
  if (avatar && profile.avatar) avatar.src = profile.avatar;
  
  const headerName = document.getElementById('headerName');
  const headerAvatar = document.getElementById('headerAvatar');
  if (headerName) headerName.textContent = `${profile.firstName} ${profile.lastName}`;
  if (headerAvatar) headerAvatar.textContent = (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '');
  
  document.getElementById('disability')?.addEventListener('change', toggleDisabilityField);
  toggleDisabilityField();
  updateAudit(profile);
}
  
  // Load avatar
  const avatar = document.getElementById('profileAvatar');
  if (avatar && profile.avatar) avatar.src = profile.avatar;
  
  // Update header
  const headerName = document.getElementById('headerName');
  const headerAvatar = document.getElementById('headerAvatar');
  if (headerName) headerName.textContent = `${profile.firstName} ${profile.lastName}`;
  if (headerAvatar) headerAvatar.textContent = (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '');
  
  // Toggle disability field
  toggleDisabilityField();
  
  // Update audit
  updateAudit();

// ✅ DISCARD: Clear all form fields
function clearAllFields() {
  const fields = ['firstName','lastName','cnic','dateOfBirth','phone','email','gender','bloodGroup','guardianName','guardianPhone','disability','disabilitySpec','address','city','postalCode','country','joiningDate'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.type === 'select-one') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
      clearError(id);
    }
  });
  
  // Reset disability field display
  toggleDisabilityField();
  
  // Show success toast
  showToast('All fields cleared', 'warning', 3000);
}

function updateAudit() {
  const profile = Storage.get(StorageKeys.STUDENT_PROFILE);
  const auditEl = document.getElementById('lastUpdatedText');
  if (auditEl && profile?.lastUpdated) {
    const date = new Date(profile.lastUpdated);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) auditEl.textContent = 'Last updated: Just now';
    else if (diff < 3600) auditEl.textContent = `Last updated: ${Math.floor(diff/60)}m ago`;
    else if (diff < 86400) auditEl.textContent = `Last updated: ${Math.floor(diff/3600)}h ago`;
    else auditEl.textContent = `Last updated: ${date.toLocaleDateString()}`;
  }
}

// ═══════════════════════════════════════════
// AVATAR FUNCTIONS
// ═══════════════════════════════════════════

function initAvatar() {
  const changeBtn = document.getElementById('changeAvatarBtn');
  const removeBtn = document.getElementById('removeAvatarBtn');
  const fileInput = document.getElementById('avatarUpload');
  const avatarImg = document.getElementById('profileAvatar');
  
  if (changeBtn && fileInput) {
    changeBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (avatarImg) avatarImg.src = ev.target.result;
          const profile = Storage.get(StorageKeys.STUDENT_PROFILE);
          if (profile) {
            profile.avatar = ev.target.result;
            profile.lastUpdated = new Date().toISOString();
            Storage.set(StorageKeys.STUDENT_PROFILE, profile);
            updateAudit();
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const defaultAvatar = `https://ui-avatars.com/api/?background=3b82f6&color=fff&name=${document.getElementById('firstName')?.value || 'F'}+${document.getElementById('lastName')?.value || 'A'}`;
      if (avatarImg) avatarImg.src = defaultAvatar;
      const profile = Storage.get(StorageKeys.STUDENT_PROFILE);
      if (profile) {
        profile.avatar = defaultAvatar;
        profile.lastUpdated = new Date().toISOString();
        Storage.set(StorageKeys.STUDENT_PROFILE, profile);
        updateAudit();
      }
    });
  }
}

// ═══════════════════════════════════════════
// PASSWORD MODAL (With Toast Requirements)
// ═══════════════════════════════════════════

function initPasswordModal() {
  const mainBtn = document.getElementById('changePasswordMainBtn');
  const modal = document.getElementById('passwordModal');
  const closeBtns = [document.getElementById('closeModalBtn'), document.getElementById('closeModalBtn2')];
  const confirmBtn = document.getElementById('confirmPasswordBtn');
  const newPwd = document.getElementById('newPwd');
  const confirmPwd = document.getElementById('confirmPwd');
  const currentPwd = document.getElementById('currentPwd');
  const hintIcon = document.querySelector('.password-hint ion-icon');
  
  // Show requirements in toast when clicking hint icon
  if (hintIcon) {
    hintIcon.style.cursor = 'pointer';
    hintIcon.parentElement.addEventListener('click', (e) => {
      e.preventDefault();
      showPasswordRequirementsToast();
    });
  }
  
  if (mainBtn && modal) {
    mainBtn.addEventListener('click', () => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Clear fields and errors
      [currentPwd, newPwd, confirmPwd].forEach(el => {
        if (el) { el.value = ''; el.classList.remove('error'); }
      });
      document.querySelectorAll('.password-error-msg').forEach(el => el.classList.remove('show'));
    });
  }
  
  closeBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => {
      modal?.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
  
  // Real-time password validation
  if (newPwd) {
    newPwd.addEventListener('input', () => {
      const result = validatePassword(newPwd.value);
      newPwd.classList.toggle('error', !result.valid);
      // Clear confirm error if passwords now match
      if (confirmPwd && confirmPwd.value && newPwd.value === confirmPwd.value) {
        clearError('confirmPwd');
      }
    });
  }
  
  // Real-time confirm password validation
  if (confirmPwd) {
    confirmPwd.addEventListener('input', () => {
      const newPwdVal = newPwd?.value || '';
      if (confirmPwd.value === newPwdVal && newPwdVal.length >= 6) {
        clearError('confirmPwd');
      }
    });
  }
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const current = currentPwd?.value;
      const newP = newPwd?.value;
      const confirm = confirmPwd?.value;
      let valid = true;
      
      // Validate current password
      if (!current) {
        const err = document.getElementById('currentPwdError');
        if (err) { err.classList.add('show'); err.style.display = 'block'; valid = false; }
        currentPwd?.classList.add('error');
      } else {
        document.getElementById('currentPwdError')?.classList.remove('show');
        currentPwd?.classList.remove('error');
      }
      
      // Validate new password
      const pwdResult = validatePassword(newP);
      if (!pwdResult.valid) {
        // Show requirements in toast
        showPasswordRequirementsToast();
        valid = false;
        newPwd?.classList.add('error');
      } else {
        newPwd?.classList.remove('error');
      }
      
      // Validate confirm
      if (newP !== confirm) {
        const err = document.getElementById('confirmPwdError');
        if (err) { err.classList.add('show'); err.style.display = 'block'; valid = false; }
        confirmPwd?.classList.add('error');
      } else {
        document.getElementById('confirmPwdError')?.classList.remove('show');
        confirmPwd?.classList.remove('error');
      }
      
      if (valid) {
        // Close modal first
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Show success toast
        showToast('✅ Password updated successfully!', 'success', 4000);
        
        // Clear password fields
        if (currentPwd) currentPwd.value = '';
        if (newPwd) newPwd.value = '';
        if (confirmPwd) confirmPwd.value = '';
      }
    });
  }
}

// ═══════════════════════════════════════════
// SAVE/DISCARD FUNCTIONS
// ═══════════════════════════════════════════

// ✅ SAVE PROFILE TO DATABASE
async function saveProfileToDB(profileData) {
    try {
        const regNo = getCurrentRegNo();
        
        // This sends data to Supabase. 'upsert' updates if exists, creates if new.
        const { error } = await window.supabase
            .from('students') // Target table
            .upsert({
                reg_no: regNo, // Primary Key
                first_name: profileData.firstName,
                last_name: profileData.lastName,
                email: profileData.email,
                phone: profileData.phone,
                // ... add other fields as needed
            });

        if (error) throw error;
        showToast('Profile saved successfully!', 'success');
        return true;
    } catch (err) {
        console.error('Error saving profile:', err);
        showToast('Failed to save profile.', 'error');
        return false;
    }
}

// ✅ LOAD PROFILE FROM DATABASE
async function loadProfileFromDB() {
    try {
        const regNo = getCurrentRegNo();

        const { data, error } = await window.supabase
            .from('students')
            .select('*')
            .eq('reg_no', regNo) // Find row with this RegNo
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 means 0 rows (new user)

        if (data) {
            // Update your form fields with DB data
            document.getElementById('firstName').value = data.first_name || '';
            document.getElementById('lastName').value = data.last_name || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('phone').value = data.phone || '';
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

function initFormActions() {
  const saveBtn = document.getElementById('saveChangesBtn');
  const discardBtn = document.getElementById('discardBtn');
  
  // ✅ DISCARD: Clear all fields (no confirmation)
  if (discardBtn) {
    discardBtn.addEventListener('click', () => {
      clearAllFields();
    });
  }
  
  // ✅ SAVE: Stylish confirmation modal
  // 🔹 REPLACE SAVE LOGIC IN initFormActions()
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    if (!validateForm()) {
      const firstError = document.querySelector('.input-field.has-error input, .input-field.has-error select');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    showConfirmModal('Save Changes?', 'Are you sure you want to save these changes?', async () => {
      const regNo = sessionStorage.getItem('student_reg_no') || 'B22F0403CS046';
      
      // Collect data
      const dbData = {
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        cnic: document.getElementById('cnic').value.trim(),
        date_of_birth: document.getElementById('dateOfBirth').value,
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        gender: document.getElementById('gender').value,
        blood_group: document.getElementById('bloodGroup').value,
        guardian_name: document.getElementById('guardianName').value.trim(),
        guardian_phone: document.getElementById('guardianPhone').value.trim(),
        disability: document.getElementById('disability').value,
        disability_details: document.getElementById('disabilitySpec').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        postal_code: document.getElementById('postalCode').value.trim(),
        country: document.getElementById('country').value.trim(),
        joining_date: document.getElementById('joiningDate').value,
        photo_url: document.getElementById('profileAvatar').src,
        updated_at: new Date().toISOString()
      };

      try {
        // UPSERT: Update if exists, insert if not
        const { error } = await window.studentSupabase
          .from('students')
          .upsert(dbData, { onConflict: 'reg_no' }); // Ensure reg_no exists & is unique
          
        if (error) throw error;
        
        showToast('✅ Changes saved to database!', 'success', 4000);
        loadProfile(); // Refresh UI
      } catch (err) {
        console.error('❌ Save failed:', err);
        showToast('❌ Failed to save. Check console.', 'error');
      }
    });
  });
}
}

// ═══════════════════════════════════════════
// REAL-TIME VALIDATION
// ═══════════════════════════════════════════

function initRealTimeValidation() {
  const fields = [
    { id: 'firstName', rules: [{ validator: Validators.minLength, param: 3 }], msg: 'Enter first name (min 3 characters)' },
    { id: 'lastName', rules: [{ validator: Validators.minLength, param: 3 }], msg: 'Enter last name (min 3 characters)' },
    { id: 'cnic', rules: [{ validator: Validators.cnic }], msg: 'Enter valid CNIC (format: XXXXX-XXXXXXX-X)' },
    { id: 'phone', rules: [{ validator: Validators.phone }], msg: 'Enter valid phone number (min 10 digits)' },
    { id: 'email', rules: [{ validator: Validators.email }], msg: 'Enter valid Gmail address' },
    { id: 'guardianName', rules: [{ validator: Validators.minLength, param: 3 }], msg: 'Enter guardian name (min 3 characters)' },
    { id: 'guardianPhone', rules: [{ validator: Validators.phone }], msg: 'Enter valid phone number (min 10 digits)' },
    { id: 'address', rules: [{ validator: Validators.minLength, param: 10 }], msg: 'Enter complete address (min 10 characters)' },
    { id: 'city', rules: [{ validator: Validators.minLength, param: 2 }], msg: 'Enter city name' },
    { id: 'postalCode', rules: [{ validator: Validators.postalCode }], msg: 'Enter valid postal code (5 digits)' },
    { id: 'country', rules: [{ validator: Validators.minLength, param: 2 }], msg: 'Enter country name' },
    { id: 'joiningDate', rules: [{ validator: Validators.date }], msg: 'Select joining date' }
  ];
  
  fields.forEach(field => {
    const el = document.getElementById(field.id);
    if (el) {
      el.addEventListener('input', () => {
        let isValid = true;
        for (const rule of field.rules) {
          if (!rule.validator(el.value.trim(), rule.param)) {
            isValid = false;
            break;
          }
        }
        if (isValid) clearError(field.id);
      });
      el.addEventListener('blur', () => {
        let isValid = true;
        for (const rule of field.rules) {
          if (!rule.validator(el.value.trim(), rule.param)) {
            isValid = false;
            break;
          }
        }
        if (isValid) clearError(field.id);
      });
    }
  });
  
  const disabilitySpec = document.getElementById('disabilitySpec');
  if (disabilitySpec) {
    disabilitySpec.addEventListener('input', () => {
      if (disabilitySpec.value.trim().length >= 1) clearError('disabilitySpec');
    });
  }
}

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

// 🔍 SUPABASE CONNECTION TEST
(async function testConnection() {
  try {
    if (!window.studentSupabase) {
      console.error('❌ Supabase client not loaded');
      return;
    }
    // Safe ping: query a non-existent table to verify connection
    const { error } = await window.studentSupabase
      .from('_test_ping')
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('✅ Supabase connected successfully!');
    } else if (error) {
      console.error('⚠️ Connection issue:', error.message);
    }
  } catch (err) {
    console.error('❌ Failed to initialize Supabase:', err);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  Storage.init();
  loadProfile();
  initAvatar();
  initPasswordModal();
  initFormActions();
  initRealTimeValidation();
  
  document.getElementById('disability')?.addEventListener('change', toggleDisabilityField);
  

});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('passwordModal')?.classList.remove('active');
    document.querySelectorAll('.confirm-modal-overlay').forEach(m => m.remove());
    document.body.style.overflow = '';
  }
});