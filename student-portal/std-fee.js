/**
 * SmartDormX - Student Fee Portal
 * ✅ Production Ready
 * ✅ LocalStorage Backend
 * ✅ Full Validation
 * ✅ Responsive
 * ✅ Month Filter with Reset Button
 */

// ═══════════════════════════════════════════
// DATA MANAGEMENT (LocalStorage Backend)
// ═══════════════════════════════════════════

const STORAGE_KEYS = {
  STUDENT_DATA: 'smartdorm_student_data',
  PAYMENTS: 'smartdorm_payments',
  CURRENT_USER: 'smartdorm_current_user'
};

// Initialize default data
const defaultData = {
  student: {
    name: 'Fahad Ali',
    regNo: 'B22F0403CS046',
    email: 'fahad.ali@student.fh.de',
    phone: '+92 300 1234567'
  },
  hostel: [
    { id: 1, voucherNo: 'B22F183/17/LC', session: 'SPRING 2025', amount: 18500, dueDate: '2025-03-15', status: 'pending' },
    { id: 2, voucherNo: 'B22F183/18/LC', session: 'FALL 2024', amount: 24000, dueDate: '2024-10-01', status: 'paid' },
    { id: 3, voucherNo: 'B22F183/19/LC', session: 'SPRING 2024', amount: 19200, dueDate: '2024-03-15', status: 'paid' }
  ],
  mess: [
    { id: 1, voucherNo: 'M22F183/01', month: 'January 2025', amount: 10000, dueDate: '2025-01-10', status: 'pending' },
    { id: 2, voucherNo: 'M22F183/02', month: 'February 2025', amount: 10000, dueDate: '2025-02-10', status: 'submitted' },
    { id: 3, voucherNo: 'M22F183/03', month: 'March 2025', amount: 10000, dueDate: '2025-03-10', status: 'verified' },
    { id: 4, voucherNo: 'M22F183/04', month: 'April 2025', amount: 10000, dueDate: '2025-04-10', status: 'pending' },
    { id: 5, voucherNo: 'M22F183/05', month: 'May 2025', amount: 10000, dueDate: '2025-05-10', status: 'pending' }
  ]
};

// Storage Helper Functions
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
  
  initialize() {
    if (!this.get(STORAGE_KEYS.STUDENT_DATA)) {
      this.set(STORAGE_KEYS.STUDENT_DATA, defaultData);
    }
    if (!this.get(STORAGE_KEYS.PAYMENTS)) {
      this.set(STORAGE_KEYS.PAYMENTS, []);
    }
  }
};

// Initialize storage on load
Storage.initialize();

// Get student data
function getStudentData() {
  return Storage.get(STORAGE_KEYS.STUDENT_DATA) || defaultData;
}

// Save student data
function saveStudentData(data) {
  return Storage.set(STORAGE_KEYS.STUDENT_DATA, data);
}

// Get payments
function getPayments() {
  return Storage.get(STORAGE_KEYS.PAYMENTS) || [];
}

// Save payment
function savePayment(payment) {
  const payments = getPayments();
  payments.push({
    ...payment,
    id: Date.now(),
    submittedAt: new Date().toISOString()
  });
  return Storage.set(STORAGE_KEYS.PAYMENTS, payments);
}

// ═══════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════

const Validator = {
  required(value) {
    return value && value.toString().trim() !== '';
  },
  
  minLength(value, length) {
    return value && value.length >= length;
  },
  
  maxLength(value, length) {
    return value && value.length <= length;
  },
  
  number(value) {
    return !isNaN(value) && value !== '';
  },
  
  positiveNumber(value) {
    return this.number(value) && parseFloat(value) > 0;
  },
  
  date(value) {
    return value && !isNaN(new Date(value).getTime());
  },
  
  file(value) {
    return value && value.files && value.files.length > 0;
  },
  
  fileSize(file, maxSizeMB = 5) {
    return file && file.size <= maxSizeMB * 1024 * 1024;
  },
  
  fileType(file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) {
    return file && allowedTypes.includes(file.type);
  },
  
  pattern(value, regex) {
    return regex.test(value);
  }
};

// Show error message
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  
  if (field) {
    field.classList.add('error');
  }
  
  if (errorEl) {
    errorEl.textContent = message;
  }
}

// Clear error message
function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  
  if (field) {
    field.classList.remove('error');
  }
  
  if (errorEl) {
    errorEl.textContent = '';
  }
}

// Clear all errors
function clearAllErrors() {
  const errorElements = document.querySelectorAll('.error-message');
  const inputElements = document.querySelectorAll('input, select, textarea');
  
  errorElements.forEach(el => el.textContent = '');
  inputElements.forEach(el => el.classList.remove('error'));
}

// Validate form field
function validateField(fieldId, rules) {
  const field = document.getElementById(fieldId);
  if (!field) return false;
  
  const value = field.type === 'file' ? field.files[0] : field.value;
  
  for (const rule of rules) {
    const { validator, message } = rule;
    
    if (!validator(value)) {
      showError(fieldId, message);
      return false;
    }
  }
  
  clearError(fieldId);
  return true;
}

// ═══════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════

let currentTab = 'hostel';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// Show alert modal
function showAlert(title, message) {
  $('#alertTitle').innerHTML = `<i class="fas fa-info-circle"></i> ${title}`;
  $('#alertMessage').textContent = message;
  $('#alertModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close alert modal
function closeAlertModal() {
  $('#alertModal').classList.remove('active');
  document.body.style.overflow = '';
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PK', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Format currency
function formatCurrency(amount) {
  return `PKR ${parseFloat(amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
}

// ═══════════════════════════════════════════
// SIDEBAR & HEADER
// ═══════════════════════════════════════════

function toggleSidebar() {
  $('#sidebar').classList.add('active');
  $('#overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  $('#sidebar').classList.remove('active');
  $('#overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function toggleProfileDropdown() {
  const dropdown = $('#profileDropdown');
  const arrow = $('#profileArrow');
  
  dropdown.classList.toggle('active');
  arrow.style.transform = dropdown.classList.contains('active') ? 'rotate(180deg)' : '';
}

// Close dropdown when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.header-profile-section')) {
    $('#profileDropdown')?.classList.remove('active');
    $('#profileArrow')?.style.setProperty('transform', '');
  }
});

// ═══════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════

function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // Show/hide sections
  $$('.tab-section').forEach(section => {
    section.classList.remove('active');
  });
  
  const targetSection = $(`#section-${tab}`);
  if (targetSection) {
    targetSection.classList.add('active');
    
    // Smooth scroll to section
    setTimeout(() => {
      targetSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  }
  
  // Render table
  renderTable(tab);
}

// ═══════════════════════════════════════════
// TABLE RENDERING
// ═══════════════════════════════════════════

function renderTable(type) {
  const tbody = $(`#${type}-tbody`);
  const data = getStudentData()[type] || [];
  
  // Filter mess by month if selected
  let filteredData = [...data];
  if (type === 'mess') {
    const monthInput = $('#mess-month-filter')?.value;
    if (monthInput) {
      const [year, monthNum] = monthInput.split('-');
      const monthNames = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
      const filterMonth = `${monthNames[parseInt(monthNum)]} ${year}`;
      filteredData = filteredData.filter(r => r.month === filterMonth);
    }
  }
  
  if (!filteredData.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No records found</p>
        </td>
      </tr>
    `;
    $(`#${type}-count`).textContent = '0';
    return;
  }
  
  tbody.innerHTML = filteredData.map((record, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(record.voucherNo)}</strong></td>
      <td>${type === 'hostel' ? escapeHtml(record.session) : escapeHtml(record.month)}</td>
      <td><strong>${formatCurrency(record.amount)}</strong></td>
      <td>${formatDate(record.dueDate)}</td>
      <td>${getStatusBadge(record.status)}</td>
      <td>
        <div class="action-group">
          <button class="icon-btn download" onclick="viewVoucher('${type}', ${record.id})" title="Download Voucher" aria-label="Download Voucher">
            <i class="fas fa-download"></i>
          </button>
          ${record.status === 'pending' ? `
            <button class="icon-btn view" onclick="openUploadModal('${type}', ${record.id})" title="Upload Payment" aria-label="Upload Payment">
              <i class="fas fa-upload"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
  
  $(`#${type}-count`).textContent = filteredData.length;
}

function getStatusBadge(status) {
  const badges = {
    pending: '<i class="fas fa-clock"></i> Pending',
    submitted: '<i class="fas fa-paper-plane"></i> Submitted',
    verified: '<i class="fas fa-check-circle"></i> Verified',
    paid: '<i class="fas fa-check-double"></i> Paid',
    overdue: '<i class="fas fa-exclamation-triangle"></i> Overdue'
  };
  
  const classes = {
    pending: 'status-pending',
    submitted: 'status-submitted',
    verified: 'status-verified',
    paid: 'status-paid',
    overdue: 'status-overdue'
  };
  
  return `<span class="status ${classes[status] || ''}">${badges[status] || status}</span>`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════
// FILTER FUNCTIONS
// ═══════════════════════════════════════════

function filterMessByMonth() {
  renderTable('mess');
}

function clearMessFilter() {
  const monthFilter = $('#mess-month-filter');
  if (monthFilter) {
    monthFilter.value = '';
  }
  renderTable('mess');
}

// ═══════════════════════════════════════════
// FILE UPLOAD HANDLING
// ═══════════════════════════════════════════

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    showError('voucherFile', 'Invalid file type. Please upload JPG, PNG, or PDF only.');
    input.value = '';
    return;
  }
  
  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    showError('voucherFile', 'File size must be less than 5MB.');
    input.value = '';
    return;
  }
  
  clearError('voucherFile');
  
  // Show file preview
  $('#fileUploadBox').classList.add('has-file');
  $('#filePreview').innerHTML = `
    <i class="fas fa-file-alt"></i>
    <span>${escapeHtml(file.name)} <small>(${formatFileSize(file.size)})</small></span>
    <button type="button" class="remove-file" onclick="removeFile()" aria-label="Remove file">
      <i class="fas fa-times"></i>
    </button>
  `;
  $('#filePreview').classList.add('active');
}

function removeFile() {
  const input = $('#voucherFile');
  input.value = '';
  $('#fileUploadBox').classList.remove('has-file');
  $('#filePreview').classList.remove('active');
  clearError('voucherFile');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ═══════════════════════════════════════════
// UPLOAD MODAL
// ═══════════════════════════════════════════

function openUploadModal(type, id = null) {
  const data = getStudentData();
  const records = data[type] || [];
  const record = id ? records.find(r => r.id === id) : records[0];
  
  if (!record) {
    showAlert('Error', 'No record found');
    return;
  }
  
  // Set modal data
  $('#modalSessionText').textContent = type === 'hostel' ? record.session : record.month;
  $('#modalVoucherNo').textContent = record.voucherNo;
  
  // Set form data attributes
  const form = $('#uploadForm');
  form.dataset.recordId = id;
  form.dataset.type = type;
  form.dataset.amount = record.amount;
  
  // Reset form
  form.reset();
  clearAllErrors();
  removeFile();
  
  // Set max date to today
  const today = new Date().toISOString().split('T')[0];
  $('#paymentDate').setAttribute('max', today);
  $('#paymentDate').value = today;
  
  // Set default amount
  $('#amountPaid').value = record.amount;
  
  // Show modal
  $('#uploadModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
  $('#uploadModal').classList.remove('active');
  document.body.style.overflow = '';
  clearAllErrors();
  removeFile();
}

// ═══════════════════════════════════════════
// FORM VALIDATION & SUBMISSION
// ═══════════════════════════════════════════

function validateUploadForm() {
  let isValid = true;
  
  // Bank Voucher No
  if (!validateField('bankVoucherNo', [
    { validator: v => Validator.required(v), message: 'Bank voucher number is required' },
    { validator: v => Validator.minLength(v, 3), message: 'Minimum 3 characters required' },
    { validator: v => Validator.maxLength(v, 50), message: 'Maximum 50 characters allowed' }
  ])) isValid = false;
  
  // Branch Code (Must be a number)
  if (!validateField('branchCode', [
    { validator: v => Validator.required(v), message: 'Branch code is required' },
    { validator: v => Validator.number(v), message: 'Branch code must be a number' },
    { validator: v => Validator.positiveNumber(v), message: 'Branch code must be a positive number' }
  ])) isValid = false;
  
  // Bank Name
  if (!validateField('bankName', [
    { validator: v => Validator.required(v), message: 'Bank name is required' },
    { validator: v => Validator.minLength(v, 2), message: 'Minimum 2 characters required' },
    { validator: v => Validator.maxLength(v, 100), message: 'Maximum 100 characters allowed' },
    { validator: v => Validator.pattern(v, /^[A-Za-z\s]+$/), message: 'Bank name can only contain letters and spaces' }
  ])) isValid = false;
  
  // Bank Branch
  if (!validateField('bankBranch', [
    { validator: v => Validator.required(v), message: 'Bank branch is required' },
    { validator: v => Validator.minLength(v, 2), message: 'Minimum 2 characters required' },
    { validator: v => Validator.maxLength(v, 100), message: 'Maximum 100 characters allowed' }
  ])) isValid = false;
  
  // Payment Date
  if (!validateField('paymentDate', [
    { validator: v => Validator.required(v), message: 'Payment date is required' },
    { validator: v => Validator.date(v), message: 'Invalid date' }
  ])) isValid = false;
  
  // Amount Paid
  if (!validateField('amountPaid', [
    { validator: v => Validator.required(v), message: 'Amount is required' },
    { validator: v => Validator.positiveNumber(v), message: 'Amount must be a positive number' }
  ])) isValid = false;
  
  // Voucher File
  const fileInput = $('#voucherFile');
  if (!validateField('voucherFile', [
    { validator: v => Validator.file(v), message: 'Please upload bank voucher' },
    { validator: v => Validator.fileSize(v, 5), message: 'File size must be less than 5MB' },
    { 
      validator: v => {
        const file = v.files?.[0];
        return file && Validator.fileType(file, ['image/jpeg', 'image/png', 'application/pdf']);
      }, 
      message: 'Only JPG, PNG, or PDF files are allowed' 
    }
  ])) isValid = false;
  
  return isValid;
}

async function submitPayment(e) {
  e.preventDefault();
  
  // Validate form
  if (!validateUploadForm()) {
    showAlert('Validation Error', 'Please correct the errors in the form');
    return;
  }
  
  const form = e.target;
  const submitBtn = $('#submitBtn');
  
  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  
  try {
    const type = form.dataset.type;
    const recordId = parseInt(form.dataset.recordId);
    const expectedAmount = parseFloat(form.dataset.amount);
    
    // Get form data
    const paymentData = {
      recordId: recordId,
      type: type,
      bankVoucherNo: $('#bankVoucherNo').value.trim(),
      branchCode: parseInt($('#branchCode').value),
      bankName: $('#bankName').value.trim(),
      bankBranch: $('#bankBranch').value.trim(),
      paymentDate: $('#paymentDate').value,
      amountPaid: parseFloat($('#amountPaid').value),
      fileName: $('#voucherFile').files[0].name,
      fileSize: $('#voucherFile').files[0].size,
      fileType: $('#voucherFile').files[0].type
    };
    
    // Validate amount
    if (paymentData.amountPaid !== expectedAmount) {
      showAlert(
        'Amount Mismatch', 
        `The amount paid (${formatCurrency(paymentData.amountPaid)}) does not match the voucher amount (${formatCurrency(expectedAmount)}). Please verify.`
      );
      return;
    }
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Save payment to localStorage
    const saved = savePayment(paymentData);
    
    if (saved) {
      // Update record status in student data
      const data = getStudentData();
      const record = data[type].find(r => r.id === recordId);
      if (record) {
        record.status = 'submitted';
        record.paymentInfo = paymentData;
        saveStudentData(data);
      }
      
      // Close modal and refresh table
      closeUploadModal();
      renderTable(type);
      
      showAlert('Success', 'Payment proof uploaded successfully! Admin will verify it soon.');
    } else {
      throw new Error('Failed to save payment');
    }
    
  } catch (error) {
    console.error('Payment submission error:', error);
    showAlert('Error', 'Failed to upload payment. Please try again.');
  } finally {
    // Re-enable submit button
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Payment';
  }
}

// ═══════════════════════════════════════════
// VIEW & DOWNLOAD VOUCHER
// ═══════════════════════════════════════════

function viewVoucher(type, id) {
  const data = getStudentData();
  const record = data[type].find(r => r.id === id);
  
  if (!record) {
    showAlert('Error', 'Voucher not found');
    return;
  }
  
  window.currentVoucherData = { ...record, type };
  
  const student = data.student;
  
  $('#voucherContent').innerHTML = `
    <div id="printable-voucher" style="border:2px dashed #e2e8f0;border-radius:12px;padding:24px;background:#fff">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e2e8f0">
        <div style="width:48px;height:48px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px"><i class="fas fa-building"></i></div>
        <div><div style="font-size:16px;font-weight:800;color:#1e293b">SmartDormX</div><div style="font-size:12px;color:#64748b">Student Fee Voucher</div></div>
      </div>
      <div style="background:#eff6ff;border:1px solid #2563eb;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <div style="font-size:12px;color:#64748b;margin-bottom:4px">Voucher Number</div>
        <div style="font-size:16px;font-weight:700;color:#2563eb">${escapeHtml(record.voucherNo)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Student</div><div style="font-weight:600">${escapeHtml(student.name)}</div></div>
        <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Reg No</div><div style="font-weight:600">${escapeHtml(student.regNo)}</div></div>
        <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${type==='hostel'?'Session':'Month'}</div><div style="font-weight:600">${escapeHtml(type==='hostel'?record.session:record.month)}</div></div>
        <div><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Due Date</div><div style="font-weight:600">${formatDate(record.dueDate)}</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead><tr style="background:#f8fafc"><th style="padding:10px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Description</th><th style="padding:10px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Amount (PKR)</th></tr></thead>
        <tbody>
          <tr><td style="padding:12px 10px;border-top:1px solid #e2e8f0">${type==='hostel'?'Hostel Accommodation Fee':'Mess & Dining Charges'}</td><td style="padding:12px 10px;border-top:1px solid #e2e8f0;text-align:right;font-weight:700">${record.amount.toLocaleString()}</td></tr>
          <tr style="background:#eff6ff"><td style="padding:12px 10px;font-weight:800;color:#2563eb">Total Amount</td><td style="padding:12px 10px;text-align:right;font-weight:800;color:#2563eb;font-size:16px">${record.amount.toLocaleString()}</td></tr>
        </tbody>
      </table>
      <div style="text-align:center;padding:16px;border-top:1px dashed #e2e8f0"><div style="display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border:2px solid #2563eb;border-radius:20px;font-size:12px;font-weight:700;color:#2563eb"><i class="fas fa-shield-alt"></i> Official Fee Voucher</div></div>
    </div>`;
  
  $('#viewVoucherModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function downloadVoucher() {
  if (!window.currentVoucherData) return;
  
  const content = $('#voucherContent').innerHTML;
  const voucherData = window.currentVoucherData;
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <html>
    <head>
      <title>Voucher - ${voucherData.voucherNo}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        body { 
          font-family: 'Inter', sans-serif; 
          padding: 20px; 
          background: #fff;
        }
        @media print { 
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      ${content}
      <script>
        window.onload = function() { 
          window.print(); 
        }
      <\/script>
    </body>
    </html>
  `);
  
  printWindow.document.close();
}

function closeViewVoucherModal() {
  $('#viewVoucherModal').classList.remove('active');
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════════
// EVENT LISTENERS & INITIALIZATION
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Load student info in header
  const data = getStudentData();
  if (data.student) {
    $('#headerName').textContent = data.student.name;
    $('#headerRole').textContent = data.student.regNo;
    $('#headerAvatar').textContent = data.student.name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  // Render initial tables
  renderTable('hostel');
  renderTable('mess');
  
  // Real-time validation on input
  $$('#uploadForm input').forEach(input => {
    input.addEventListener('input', () => {
      clearError(input.id);
    });
    
    input.addEventListener('blur', () => {
      // Validate on blur
      if (input.id === 'bankVoucherNo') {
        validateField('bankVoucherNo', [
          { validator: v => Validator.required(v), message: 'Bank voucher number is required' }
        ]);
      }
    });
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeUploadModal();
    closeViewVoucherModal();
    closeAlertModal();
    closeSidebar();
  }
});

// Close modals on outside click
$('#uploadModal')?.addEventListener('click', e => {
  if (e.target.id === 'uploadModal') closeUploadModal();
});

$('#viewVoucherModal')?.addEventListener('click', e => {
  if (e.target.id === 'viewVoucherModal') closeViewVoucherModal();
});

$('#alertModal')?.addEventListener('click', e => {
  if (e.target.id === 'alertModal') closeAlertModal();
});

// Prevent form resubmission on refresh
if (window.history.replaceState) {
  window.history.replaceState(null, null, window.location.href);
}
