/**
 * SmartDormX - Payments Management
 * ✅ 12 Records Per Page
 * ✅ Previous/Next Buttons Working
 * ✅ localStorage Backend Ready
 */

// ============ CONFIGURATION ============
const CONFIG = {
  STORAGE_KEYS: { HOSTEL: 'sd_hostel', MESS: 'sd_mess' },
  PER_PAGE: 12  // ✅ Changed from 8 to 12 records per page
};

// ============ STATE ============
const state = {
  hostel: { data: [], filtered: [], page: 1, filters: { search: '', status: '' } },
  mess: { data: [], filtered: [], page: 1, filters: { search: '', status: '', month: '' } }
};

// ============ HELPERS ============
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = n => 'PKR ' + Number(n).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const formatSession = sem => {
  if (!sem) return '-';
  const [name, year] = sem.split(' ');
  return `${name}-${year?.slice(-2) || ''}`;
};

const getYearFromMonth = mv => mv ? mv.split('-')[0] : '';
const getMonthName = mv => {
  if (!mv) return '';
  const m = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
  return m[parseInt(mv.split('-')[1], 10)] || '';
};
const messMonthMatches = (rm, sm) => !sm || rm === `${getMonthName(sm)} ${getYearFromMonth(sm)}`;

const toWords = num => {
  if (num === 0) return 'Zero Rupees Only.';
  const o = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'],
        t = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],
        x = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const w = n => n<10?o[n]:n<20?t[n-10]:n<100?x[Math.floor(n/10)]+(n%10?' '+o[n%10]:''):n<1000?o[Math.floor(n/100)]+' Hundred'+(n%100?' and '+w(n%100):''):n<100000?w(Math.floor(n/1000))+' Thousand'+(n%1000?' '+w(n%1000):''):w(Math.floor(n/100000))+' Lakh'+(n%100000?' '+w(n%100000):'');
  return w(num) + ' Rupees Only.';
};

// ============ STORAGE API ============
const StorageAPI = {
  get(k, fb = []) { try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : fb; } catch(e) { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
  update(k, id, up) {
    const d = this.get(k), i = d.findIndex(x => x.id === id);
    if (i !== -1) { d[i] = { ...d[i], ...up }; this.set(k, d); return true; }
    return false;
  }
};

// ============ SAMPLE DATA ============
function initSampleData() {
  if (StorageAPI.get(CONFIG.STORAGE_KEYS.HOSTEL).length) return;
  
  const progs = ['CS','DS','AI','SE','CH','BMS','EE','CE','ME','IE'];
  const rooms = ['AF-101','BS-210','CF-225','SG-110','RF-120','AS-205','BG-102','CS-325','RG-101'];
  const names = ['Fahad Ali','Usman Tariq','Sara Khan','Hamza Raza','Nadia Malik','Ali Hassan','Zainab Bibi','Bilal Ahmed','Rimsha Arif','Tariq Mehmood','Ayesha Nawaz','Kamran Shah','Ahmed Raza','Hassan Ali','Fatima Noor','Usama Khalid','Sana Iqbal','Jawad Khan','Ali Raza','Hina Malik'];
  
  // Hostel: 20 records, varied fees 7K-35K
  const hostel = [];
  const sems = [{n:'Spring 2025',i:'2025-01-15',d:'2025-03-15'},{n:'Fall 2024',i:'2024-08-01',d:'2024-10-01'}];
  for (let i=0; i<20; i++) {
    const y = 2024 + Math.floor(Math.random()*2);
    const p = progs[Math.floor(Math.random()*progs.length)];
    const s = sems[Math.floor(Math.random()*sems.length)];
    const r = 400 + i;
    hostel.push({
      id: `H-${Date.now()}-${i}`,
      reg: `B${String(y).slice(-2)}F${String(r).padStart(4,'0')}${p}${String(Math.floor(Math.random()*900)+100)}`,
      name: names[i%names.length],
      room: rooms[i%rooms.length],
      semester: s.n,
      amount: Math.floor(Math.random()*28000)+7000,
      issue: s.i,
      due: s.d,
      status: i%3===0?'Paid':i%3===1?'Unpaid':'Overdue'
    });
  }
  
  // Mess: 20 records, fixed 10K fee
  const mess = [];
  const ms = [{n:'January 2025',i:'2025-01-01',d:'2025-01-10'},{n:'February 2025',i:'2025-02-01',d:'2025-02-10'},{n:'March 2025',i:'2025-03-01',d:'2025-03-10'},{n:'April 2025',i:'2025-04-01',d:'2025-04-10'}];
  for (let i=0; i<20; i++) {
    const y = 2024 + Math.floor(Math.random()*2);
    const p = progs[Math.floor(Math.random()*progs.length)];
    const m = ms[Math.floor(Math.random()*ms.length)];
    const r = 400 + i;
    mess.push({
      id: `M-${Date.now()}-${i}`,
      reg: `B${String(y).slice(-2)}F${String(r).padStart(4,'0')}${p}${String(Math.floor(Math.random()*900)+100)}`,
      name: names[i%names.length],
      room: rooms[i%rooms.length],
      month: m.n,
      amount: 10000,
      issue: m.i,
      due: m.d,
      status: i%3===0?'Paid':i%3===1?'Unpaid':'Overdue'
    });
  }
  
  StorageAPI.set(CONFIG.STORAGE_KEYS.HOSTEL, hostel);
  StorageAPI.set(CONFIG.STORAGE_KEYS.MESS, mess);
}

// ============ FILTERS ============
function handleFilter(type, field) {
  const el = $(`#${type}-${field}`);
  if (!el) return;
  state[type].filters[field] = el.value;
  state[type].page = 1;
  applyFilters(type);
}

/**
 * Reset filters & reload payments
 */
async function resetFilters(type) {
  $(`#${type}-search`).value = '';
  $(`#${type}-status`).value = '';
  if (type === 'mess' && $('#mess-month')) $('#mess-month').value = '';
  
  // Also clear state filters so getFiltered() doesn't reapply old values
  state[type].filters = { search: '', status: '', month: '' };
  state[type].page = 1;

  await applyFilters(type);
  showToast('Filters reset', 'info');
}

function getFiltered(data, type) {
  const f = state[type].filters;
  return data.filter(r => {
    const q = f.search.toLowerCase();
    return (!f.search || r.name.toLowerCase().includes(q) || r.reg.toLowerCase().includes(q)) &&
           (!f.status || r.status === f.status) &&
           (type !== 'mess' || messMonthMatches(r.month, f.month));
  });
}

/**
 * Load & filter payments from Supabase (joins students table for names)
 */
async function applyFilters(type) {
  try {
    console.log(`🔄 Loading ${type} payments from Supabase...`);

    const table = type === 'hostel' ? 'payments_hostel' : 'payments_mess';

    // 1. Fetch payment records
    const { data: payments, error: payErr } = await window.supabaseClient
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    if (payErr) throw payErr;

    // 2. Fetch all students to look up names
    const { data: students, error: stuErr } = await window.supabaseClient
      .from('students')
      .select('reg_no, first_name, last_name, room, hostel');
    if (stuErr) throw stuErr;

    // 3. Build a quick lookup map: reg_no → student info
    const studentMap = {};
    (students || []).forEach(s => { studentMap[s.reg_no] = s; });

    // 4. Merge student name into every payment record
    const allRecords = (payments || []).map(p => {
      const reg = p.student_reg_no || p.reg_no || p.reg || 'N/A';
      const stu = studentMap[reg];
      return {
        ...p,
        reg,
        name:     stu ? `${stu.first_name} ${stu.last_name || ''}`.trim() : (p.name || 'Unknown'),
        room:     p.room || stu?.room || 'N/A',
        semester: p.semester || p.session || '',
        month:    p.month || '',
        amount:   p.amount || 0,
        issue:    p.issue_date || p.issue || '',
        due:      p.due_date  || p.due  || '',
        status:   p.status || 'Unpaid',
      };
    });

    state[type].data     = allRecords;
    state[type].filtered = getFiltered(allRecords, type);
    state[type].page     = 1;

    updateStats(allRecords, `${type}-stats`);
    $(`#${type}-count`).textContent = allRecords.length;

    if (type === 'hostel') { renderHostelTable(); renderPagination('hostel'); }
    else                   { renderMessTable();   renderPagination('mess');   }

    console.log(`✅ Loaded ${allRecords.length} ${type} payments (with student names)`);

  } catch (err) {
    console.warn(`⚠️ Supabase failed (${err.message}), falling back to localStorage for ${type}`);

    const key = CONFIG.STORAGE_KEYS[type.toUpperCase()];
    const src = StorageAPI.get(key);
    state[type].data     = src;
    state[type].filtered = getFiltered(src, type);
    state[type].page     = 1;
    updateStats(src, `${type}-stats`);
    $(`#${type}-count`).textContent = src.length;

    if (type === 'hostel') { renderHostelTable(); renderPagination('hostel'); }
    else                   { renderMessTable();   renderPagination('mess');   }
  }
}

// ============ STATS ============
function updateStats(data, cid) {
  const paid = data.filter(r => r.status === 'Paid');
  const unpaid = data.filter(r => r.status === 'Unpaid');
  const overdue = data.filter(r => r.status === 'Overdue');
  const col = paid.reduce((a, r) => a + r.amount, 0);
  const el = $(cid);
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card teal"><div class="stat-icon"><i class="fas fa-coins"></i></div><div class="stat-label">Collected</div><div class="stat-value">${fmt(col)}</div></div>
    <div class="stat-card orange"><div class="stat-icon"><i class="fas fa-clock"></i></div><div class="stat-label">Pending</div><div class="stat-value">${unpaid.length}</div></div>
    <div class="stat-card red"><div class="stat-icon"><i class="fas fa-triangle-exclamation"></i></div><div class="stat-label">Overdue</div><div class="stat-value">${overdue.length}</div></div>
    <div class="stat-card green"><div class="stat-icon"><i class="fas fa-check-circle"></i></div><div class="stat-label">Paid</div><div class="stat-value">${paid.length}</div></div>`;
}

// ============ TABLES ============
function renderHostelTable() {
  const s = state.hostel;
  const start = (s.page - 1) * CONFIG.PER_PAGE;
  const pageData = s.filtered.slice(start, start + CONFIG.PER_PAGE);
  const tbody = $('#hostel-tbody');
  if (!tbody) return;
  
  if (!pageData.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><i class="fas fa-inbox empty-icon"></i><div style="margin-top:8px">No records found</div></td></tr>`;
    return;
  }
  
  tbody.innerHTML = pageData.map((r, i) => `
    <tr>
      <td style="color:var(--text-muted);font-size:12px">${start+i+1}</td>
      <td><span class="reg-no">${r.reg}</span></td>
      <td><span class="student-name">${r.name}</span></td>
      <td><span class="room-badge">${r.room}</span></td>
      <td><span class="semester-badge">${formatSession(r.semester)}</span></td>
      <td class="amount-cell">${fmt(r.amount)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${r.issue}</td>
      <td style="font-size:12px;color:var(--text-muted)">${r.due}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <div class="action-group">
          <button class="icon-btn" title="View Voucher" onclick="openVoucher('hostel','${r.id}')"><i class="fas fa-receipt"></i></button>
          <button class="icon-btn success" title="Mark Paid" onclick="markStatus('hostel','${r.id}','Paid')"><i class="fas fa-check"></i></button>
          <button class="icon-btn danger" title="Mark Unpaid" onclick="markStatus('hostel','${r.id}','Unpaid')"><i class="fas fa-xmark"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderMessTable() {
  const s = state.mess;
  const start = (s.page - 1) * CONFIG.PER_PAGE;
  const pageData = s.filtered.slice(start, start + CONFIG.PER_PAGE);
  const tbody = $('#mess-tbody');
  if (!tbody) return;
  
  if (!pageData.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="10"><i class="fas fa-inbox empty-icon"></i><div style="margin-top:8px">No records found</div></td></tr>`;
    return;
  }
  
  tbody.innerHTML = pageData.map((r, i) => `
    <tr>
      <td style="color:var(--text-muted);font-size:12px">${start+i+1}</td>
      <td><span class="reg-no">${r.reg}</span></td>
      <td><span class="student-name">${r.name}</span></td>
      <td><span class="room-badge">${r.room}</span></td>
      <td><span class="month-badge"><i class="fas fa-calendar-day"></i> ${r.month}</span></td>
      <td class="amount-cell">${fmt(r.amount)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${r.issue}</td>
      <td style="font-size:12px;color:var(--text-muted)">${r.due}</td>
      <td>${statusBadge(r.status)}</td>
      <td>
        <div class="action-group">
          <button class="icon-btn" title="View Voucher" onclick="openVoucher('mess','${r.id}')"><i class="fas fa-receipt"></i></button>
          <button class="icon-btn success" title="Mark Paid" onclick="markStatus('mess','${r.id}','Paid')"><i class="fas fa-check"></i></button>
          <button class="icon-btn danger" title="Mark Unpaid" onclick="markStatus('mess','${r.id}','Unpaid')"><i class="fas fa-xmark"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function statusBadge(s) {
  const m = { Paid: 'paid', Unpaid: 'unpaid', Overdue: 'overdue', Pending: 'pending' };
  return `<span class="status status-${m[s] || 'pending'}">${s}</span>`;
}

// ============ PAGINATION - WITH PREVIOUS/NEXT BUTTONS ============
function renderPagination(type) {
  const s = state[type];
  const total = s.filtered.length;
  const pages = Math.ceil(total / CONFIG.PER_PAGE);
  const el = $(`#${type}-pagination`);
  if (!el) return;
  
  // Hide pagination if only 1 page or no data
  if (pages <= 1) { 
    el.innerHTML = ''; 
    return; 
  }
  
  const start = (s.page - 1) * CONFIG.PER_PAGE + 1;
  const end = Math.min(s.page * CONFIG.PER_PAGE, total);
  
  // ✅ Build pagination with PREVIOUS and NEXT buttons
  let html = `<div class="pagination-info">Showing ${start}–${end} of ${total} records</div>`;
  html += `<div class="pagination-btns">`;
  
  // Previous button
  html += `<button class="page-btn" onclick="goPage('${type}', ${s.page - 1})" ${s.page === 1 ? 'disabled' : ''}>
    <i class="fas fa-chevron-left"></i> Previous
  </button>`;
  
  // Page numbers
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= s.page - 1 && i <= s.page + 1)) {
      html += `<button class="page-btn ${i === s.page ? 'active' : ''}" onclick="goPage('${type}', ${i})">${i}</button>`;
    } else if (i === s.page - 2 || i === s.page + 2) {
      html += `<span style="padding:0 8px;color:var(--text-muted)">...</span>`;
    }
  }
  
  // Next button
  html += `<button class="page-btn" onclick="goPage('${type}', ${s.page + 1})" ${s.page === pages ? 'disabled' : ''}>
    Next <i class="fas fa-chevron-right"></i>
  </button>`;
  
  html += `</div>`;
  el.innerHTML = html;
}

// ✅ Go to specific page
function goPage(type, p) {
  const s = state[type];
  const total = s.filtered.length;
  const pages = Math.ceil(total / CONFIG.PER_PAGE);
  
  if (p < 1 || p > pages) return;
  
  s.page = p;
  
  if (type === 'hostel') {
    renderHostelTable();
  } else {
    renderMessTable();
  }
  renderPagination(type);
  
  // Scroll to table
  const tableCard = document.querySelector(`#section-${type} .table-card`);
  if (tableCard) {
    tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ============ STATUS UPDATE ============
/**
 * Update payment status in Supabase (with localStorage fallback)
 */
async function markStatus(type, id, ns) {
  try {
    // 1. Update in Supabase
    const success = await window.SupabasePayments.updatePaymentStatus(type, id, ns);
    
    if (success) {
      showToast(`${type === 'hostel' ? 'Hostel' : 'Mess'} updated → ${ns}`, 'success');
      // 2. Refresh data & UI
      await applyFilters(type);
    } else {
      throw new Error('Update failed');
    }
  } catch (err) {
    console.warn(`⚠️ Falling back to localStorage for ${type} status update`);
    
    // Fallback: Update localStorage & refresh
    const key = CONFIG.STORAGE_KEYS[type.toUpperCase()];
    const ok = StorageAPI.update(key, id, { status: ns });
    if (ok) {
      showToast(`${type === 'hostel' ? 'Hostel' : 'Mess'} updated (Local) → ${ns}`, 'warning');
      applyFilters(type);
    } else {
      showToast('Update failed', 'error');
    }
  }
}

// ============ VOUCHER ============
let currentVoucher = null;
function openVoucher(type, id) {
  // Read from live Supabase state first, fall back to localStorage
  const r = state[type].data.find(x => x.id === id) ||
    (() => { const key = CONFIG.STORAGE_KEYS[type.toUpperCase()]; return StorageAPI.get(key).find(x => x.id === id); })();
  if (!r) { showToast('Record not found', 'error'); return; }
  
  currentVoucher = { type, id };
  const isH = type === 'hostel';
  const vno = `VCH-${r.reg}-${Date.now().toString().slice(-4)}`;
  const per = isH ? formatSession(r.semester) : r.month;
  const aw = isH ? toWords(r.amount) : 'Ten Thousand Rupees Only.';
  
  $('#voucherBody').innerHTML = `
    <div class="voucher-card">
      <div class="voucher-header">
        <div class="voucher-logo"><i class="fas fa-building-columns"></i></div>
        <div class="voucher-org"><strong>SmartDormX</strong><span>Admin Portal • ${isH?'Hostel':'Mess'} Fee Receipt</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:12px 0;padding-bottom:12px;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">${isH?'HOSTEL FEE':'MESS FEE'} — ${per}</div>
          <div style="font-size:13px;font-weight:700">${r.name}</div>
        </div>
        <span class="semester-badge"><i class="fas fa-hashtag"></i> ${vno}</span>
      </div>
      <div class="voucher-grid">
        <div class="voucher-field"><span>Reg No</span><strong class="reg-no">${r.reg}</strong></div>
        <div class="voucher-field"><span>Room</span><strong>${r.room}</strong></div>
        <div class="voucher-field"><span>${isH?'Session':'Month'}</span><strong>${per}</strong></div>
        <div class="voucher-field"><span>Issue Date</span><strong>${r.issue}</strong></div>
        <div class="voucher-field"><span>Due Date</span><strong>${r.due}</strong></div>
        <div class="voucher-field"><span>Status</span><strong>${r.status}</strong></div>
      </div>
      <table class="voucher-table">
        <thead><tr><th>Particulars</th><th style="text-align:right">Amount (PKR)</th></tr></thead>
        <tbody>
          <tr><td>${isH?'Hostel Accommodation Fee (Semester)':'Mess & Dining Charges (Monthly)'}</td><td style="text-align:right;font-weight:600">${fmt(r.amount)}</td></tr>
          <tr class="total"><td>Total Due</td><td style="text-align:right">${fmt(r.amount)}</td></tr>
        </tbody>
      </table>
      <div class="voucher-amount-words"><strong>In Words:</strong> ${aw}</div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border)">
        <div class="national-bank-stamp"><i class="fas fa-landmark"></i><div><div class="bank-name">National Bank of Pakistan</div><div class="branch">Branch: Haripur • Verified Transaction</div></div></div>
      </div>
      <div class="verify-section" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:8px"><i class="fas fa-shield-check"></i> Admin Verification</label>
        <div class="verify-btns">
          <button class="btn-verify paid" onclick="verifyFromModal('Paid')"><i class="fas fa-check-circle"></i> Mark as Paid</button>
          <button class="btn-verify unpaid" onclick="verifyFromModal('Unpaid')"><i class="fas fa-times-circle"></i> Mark as Unpaid</button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border)">
        <span class="voucher-stamp"><i class="fas fa-shield-halved"></i> Official Receipt</span>
        <small style="color:var(--text-muted)">Generated: ${new Date().toLocaleDateString('en-PK')}</small>
      </div>
    </div>`;
  $('#voucherModal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function verifyFromModal(st) {
  if (!currentVoucher) return;
  markStatus(currentVoucher.type, currentVoucher.id, st);
  closeModal('voucherModal');
}

function closeModal(id) { $(`#${id}`)?.classList.remove('open'); document.body.style.overflow = ''; }
function closeModalOnOverlay(e) { if (e.target.id === 'voucherModal') closeModal('voucherModal'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal('voucherModal'); });

// ============ EXPORT CSV ============
/**
 * Export filtered payments to CSV
 */
function exportCSV(type) {
  const filtered = state[type].filtered;
  if (!filtered.length) { 
    showToast('No data to export', 'error'); 
    return; 
  }
  
  const isH = type === 'hostel';
  const hdr = ['#', 'Reg No', 'Name', 'Room', isH ? 'Session' : 'Month', 'Amount', 'Issue Date', 'Due Date', 'Status'];
  
  const rows = filtered.map((r, i) => {
    const som = isH ? (r.semester || '-') : (r.month || '-');
    const vals = [
      i + 1, r.reg, r.name, r.room, 
      som, r.amount, r.issue, r.due, r.status
    ];
    return vals.map(v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',');
  });
  
  const csv = [hdr.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${type}_payments_${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// ============ TOAST ============
function showToast(msg, type = 'info') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ============ UI ============
function toggleSidebar() { $('#sidebar')?.classList.toggle('open'); $('#sidebarOverlay')?.classList.toggle('show'); }
function toggleProfileDropdown() { $('#profileDropdown')?.classList.toggle('open'); }
document.addEventListener('click', e => { if (!e.target.closest('.profile-wrapper')) $('#profileDropdown')?.classList.remove('open'); });

function switchTab(tab) {
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $$('.section').forEach(s => s.classList.remove('active'));
  $(`#tab-${tab}`)?.classList.add('active');
  $(`#section-${tab}`)?.classList.add('active');
  state[tab].page = 1;
  applyFilters(tab);
}

// ============ GLOBAL FUNCTIONS ============
window.switchTab = switchTab;
window.resetFilters = resetFilters;
window.exportCSV = exportCSV;
window.openVoucher = openVoucher;
window.closeModal = closeModal;
window.verifyFromModal = verifyFromModal;
window.markStatus = markStatus;
window.goPage = goPage;
window.toggleSidebar = toggleSidebar;
window.toggleProfileDropdown = toggleProfileDropdown;
window.handleLogout = e => { e?.preventDefault(); localStorage.removeItem('sd_admin_token'); window.location.href = 'sign-in.html'; };
window.handleFilter = handleFilter;

// ============ INIT ============
function init() {
  initSampleData();
  applyFilters('hostel');
  applyFilters('mess'); // pre-load so mess tab count is correct
  console.log(`✅ SmartDormX Payments - ${CONFIG.PER_PAGE} records per page with Previous/Next buttons`);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();