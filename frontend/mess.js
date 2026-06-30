/* ── LOCAL STORAGE KEYS ── */
const LS_KEYS = {
    ATTENDANCE: 'smartdormx_attendance',
    MENU: 'smartdormx_menu',
    FEEDBACK: 'smartdormx_feedback'
};

/* ── CONSTANTS ─ */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner'];
const RATES = { 'Breakfast': 150, 'Lunch': 250, 'Dinner': 200 };

/* ── GLOBAL STATE ── */
// Initialize empty arrays; no dummy data generation
let allData = [];
let filtered = [];
let window_menuData = {};
let window_feedbacks = [];
let curPage = 1;
const PER = 10;

/* ── LOCAL STORAGE UTILS ── */
const Storage = {
    get(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            showToast('error', 'Failed to save data');
            return false;
        }
    }
};

/* ── INITIALIZATION ── */
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    await loadMenu();
    await loadFeedback();
    await loadAttendance(); 
}

/* ── WEEKLY MENU (Supabase) ── */
let currentDay = 'Monday';
let currentMealType = 'breakfast';

async function loadMenu() {
    try {
        const { data, error } = await window.supabaseClient
            .from('mess_menu')
            .select('*');
        
        if (error) throw error;
        
        // Transform flat DB rows into nested structure
        window_menuData = {};
        DAYS.forEach(d => window_menuData[d] = { breakfast: [], lunch: [], dinner: [] });
        
        data.forEach(item => {
            const day = item.day_of_week;
            const meal = item.meal_type.toLowerCase();
            if (window_menuData[day] && window_menuData[day][meal]) {
                window_menuData[day][meal].push({
                    id: item.id,
                    name: item.dish_name,
                    price: item.price
                });
            }
        });
        
        renderMenu();
    } catch (err) {
        console.error('⚠️ Menu load failed:', err);
        showToast('error', 'Failed to load menu');
    }
}

function renderMenu() {
    const daySelector = document.getElementById('daySelector');
    if (!daySelector) return;
    
    daySelector.innerHTML = DAYS.map(day => 
        `<button class="day-btn ${day === currentDay ? 'active' : ''}" onclick="selectDay('${day}')">${day}</button>`
    ).join('');
    
    renderMenuItems();
}

function selectDay(day) {
    currentDay = day;
    renderMenu();
}

function switchMealType(type) {
    currentMealType = type;
    document.querySelectorAll('.meal-type-tab').forEach(t => {
        t.classList.remove('active');
        if(t.classList.contains(type)) t.classList.add('active');
    });
    renderMenuItems();
}

function renderMenuItems() {
    const container = document.getElementById('menuItemsList');
    if (!container) return;
    
    const menu = window_menuData || {};
    const items = (menu[currentDay] && menu[currentDay][currentMealType]) || [];
    
    if (!items.length) {
        container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">No items added yet</div>';
        return;
    }
    
    container.innerHTML = items.map((item) => 
        `<div class="menu-item">
            <span class="menu-item-name">${item.name}</span>
            <div style="display:flex;align-items:center;gap:12px;">
                <span class="menu-item-price">Rs. ${item.price}</span>
                <button class="btn btn-danger btn-sm" onclick="removeMenuItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`
    ).join('');
}

async function addDishItem() {
    const nameInput = document.getElementById('newDishName');
    const priceInput = document.getElementById('newDishPrice');
    const name = nameInput.value.trim();
    const price = parseInt(priceInput.value);
    
    if (!name) { showToast('error', 'Please enter dish name'); return; }
    if (!price || price < 0) { showToast('error', 'Please enter valid price'); return; }
    
    try {
        const { error } = await window.supabaseClient
            .from('mess_menu')
            .insert([{
                day_of_week: currentDay,
                meal_type: currentMealType,
                dish_name: name,
                price: price
            }]);
        
        if (error) throw error;
        
        nameInput.value = '';
        priceInput.value = '';
        await loadMenu();
        showToast('success', 'Dish added successfully');
    } catch (err) {
        console.error('Error adding dish:', err);
        showToast('error', 'Failed to add dish');
    }
}

async function removeMenuItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const { error } = await window.supabaseClient
            .from('mess_menu')
            .delete()
            .eq('id', itemId);
        
        if (error) throw error;
        
        await loadMenu();
        showToast('success', 'Dish removed');
    } catch (err) {
        console.error('Error removing dish:', err);
        showToast('error', 'Failed to remove dish');
    }
}

function showSaveMenuModal(){
    document.getElementById('saveMenuModal').classList.add('show');
}

function closeSaveMenuModal(){
    document.getElementById('saveMenuModal').classList.remove('show');
}

function confirmSaveMenu(){
    closeSaveMenuModal();
    showToast('success', 'Menu saved successfully!');
}

/* ── ATTENDANCE & SEARCH ── */
async function loadAttendance() {
try {
// Fetch attendance records
const { data: attendanceData, error: attError } = await window.supabaseClient
  .from('mess_attendance')
  .select('*')
  .order('created_at', { ascending: false });

if (attError) throw attError;

// Fetch students
const { data: studentsData, error: studError } = await window.supabaseClient
  .from('students')
  .select('reg_no, first_name, last_name, hostel');

if (studError) throw studError;

// Create student lookup
const studentMap = {};
(studentsData || []).forEach(student => {
  studentMap[student.reg_no] = student;
});

// Combine data
allData = (attendanceData || []).map(record => {
  const student = studentMap[record.student_reg_no];
  return {
    id: record.id,
    name: student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'Unknown',
    reg: record.student_reg_no || 'N/A',
    hostel: student?.hostel || 'N/A',
    color: '#6c5ce7',
    initials: student ? 
      `${student.first_name[0]}${student.last_name ? student.last_name[0] : ''}`.toUpperCase() 
      : '?',
    meal: record.meal_type || 'N/A',
    dateStr: record.meal_date ? record.meal_date.split('T')[0] : 'N/A',
    amount: record.amount || 0,
    status: record.status || 'Paid'
  };
});

filtered = [...allData];
curPage = 1;

renderTable();
renderMealCounts();

console.log(`✅ Loaded ${allData.length} attendance records`);

} catch (err) {
console.warn('⚠️ Attendance load failed:', err);
allData = [];
filtered = [];
curPage = 1;
renderTable();
renderMealCounts();
}
}

function renderMealCounts(){
// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// Filter for today's records
const todayRecords = allData.filter(r => {
  // Handle both dateStr and direct date comparison
  return r.dateStr === today;
});

// Count each meal type (handle case variations)
const breakfastCount = todayRecords.filter(r => {
  const meal = (r.meal || '').toLowerCase();
  return meal === 'breakfast';
}).length;

const lunchCount = todayRecords.filter(r => {
  const meal = (r.meal || '').toLowerCase();
  return meal === 'lunch';
}).length;

const dinnerCount = todayRecords.filter(r => {
  const meal = (r.meal || '').toLowerCase();
  return meal === 'dinner';
}).length;

// Update the display
const cntBreakfast = document.getElementById('cntBreakfast');
const cntLunch = document.getElementById('cntLunch');
const cntDinner = document.getElementById('cntDinner');

if (cntBreakfast) cntBreakfast.textContent = breakfastCount;
if (cntLunch) cntLunch.textContent = lunchCount;
if (cntDinner) cntDinner.textContent = dinnerCount;

console.log(`📊 Today's counts - Breakfast: ${breakfastCount}, Lunch: ${lunchCount}, Dinner: ${dinnerCount}`);
}

async function applyFilters() {
try {
console.log('🔄 Loading attendance from Supabase...');
const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
const month = document.getElementById('filterMonth')?.value || '';
const status = document.getElementById('filterStatus')?.value || '';

// Step 1: Fetch attendance records
const { data: attendanceData, error: attError } = await window.supabaseClient
  .from('mess_attendance')
  .select('*')
  .order('created_at', { ascending: false });

if (attError) throw attError;

// Step 2: Fetch all students (to match with attendance)
const { data: studentsData, error: studError } = await window.supabaseClient
  .from('students')
  .select('reg_no, first_name, last_name, hostel');

if (studError) throw studError;

// Step 3: Create a lookup map for students
const studentMap = {};
(studentsData || []).forEach(student => {
  studentMap[student.reg_no] = student;
});

// Step 4: Combine attendance with student info
let allRecords = (attendanceData || []).map(record => {
  const student = studentMap[record.student_reg_no];
  return {
    id: record.id,
    name: student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'Unknown',
    reg: record.student_reg_no || 'N/A',
    hostel: student?.hostel || 'N/A',
    color: '#6c5ce7',
    initials: student ? 
      `${student.first_name[0]}${student.last_name ? student.last_name[0] : ''}`.toUpperCase() 
      : '?',
    meal: record.meal_type || 'N/A',
    dateStr: record.meal_date ? record.meal_date.split('T')[0] : 'N/A',
    amount: record.amount || 0,
    status: record.status || 'Paid'
  };
});

// Step 5: Apply filters
if (search) {
  allRecords = allRecords.filter(r => 
    r.name.toLowerCase().includes(search) || 
    r.reg.toLowerCase().includes(search)
  );
}

if (month) {
  allRecords = allRecords.filter(r => r.dateStr.startsWith(month));
}

if (status) {
  allRecords = allRecords.filter(r => 
    r.status.toLowerCase() === status.toLowerCase()
  );
}

// Step 6: Store and render
allData = allRecords;
filtered = allRecords;
curPage = 1;

renderTable();
renderMealCounts();
console.log(`✅ Loaded ${allRecords.length} attendance records`);

} catch (err) {
console.warn('⚠️ Error loading attendance:', err);
allData = [];
filtered = [];
curPage = 1;
renderTable();
renderMealCounts();
}
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterStatus').value = '';
    loadAttendance();
}

function renderTable(){
    const start = (curPage-1)*PER;
    const pageData = filtered.slice(start, start+PER);
    const tbody = document.getElementById('tableBody');
    
    if(!tbody) {
        console.error('Table body not found!');
        return;
    }
    
    if(!pageData.length){
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--muted);">No records found</td></tr>';
        document.getElementById('paginationInfo').textContent = '';
        document.getElementById('paginationBtns').innerHTML = '';
        return;
    }

    tbody.innerHTML = pageData.map((r,i) => `
        <tr>
            <td>${start+i+1}</td>
            <td>
                <div class="avatar-cell">
                    <div class="mini-avatar" style="background:${r.color || '#6c5ce7'}">
                        ${r.initials || (r.name ? r.name.split(' ').map(w=>w[0]).join('') : '?')}
                    </div>
                    <span>${r.name || 'N/A'}</span>
                </div>
            </td>
            <td style="font-size:12px;color:var(--muted)">${r.reg || 'N/A'}</td>
            <td>${r.hostel || 'N/A'}</td>
            <td>
                <span class="badge" style="background:${r.meal==='Breakfast'?'#e8f4fd':r.meal==='Lunch'?'#fff3e0':'#f0eeff'};color:${r.meal==='Breakfast'?'#0984e3':r.meal==='Lunch'?'#fd9644':'#6c5ce7'}">
                    ${r.meal || 'N/A'}
                </span>
            </td>
            <td>${r.dateStr || 'N/A'}</td>
            <td style="font-weight:700">Rs. ${r.amount || 0}</td>
            <td>
                <span class="badge badge-${(r.status || 'paid').toLowerCase()}">
                    ${r.status || 'Paid'}
                </span>
            </td>
        </tr>
    `).join('');

    const totalPages = Math.ceil(filtered.length/PER);
    const info = document.getElementById('paginationInfo');
    if(info) {
        info.textContent = `Showing ${start+1}-${Math.min(start+PER,filtered.length)} of ${filtered.length} records`;
    }

    let paginationHTML = `<button class="pg-btn" onclick="goPage(${curPage-1})" ${curPage===1?'disabled':''}>‹</button>`;
    for(let p=1; p<=totalPages; p++){
        if(p===1 || p===totalPages || Math.abs(p-curPage)<=1){
            paginationHTML += `<button class="pg-btn ${p===curPage?'active':''}" onclick="goPage(${p})">${p}</button>`;
        } else if(Math.abs(p-curPage)===2){
            paginationHTML += `<button class="pg-btn" disabled>…</button>`;
        }
    }
    paginationHTML += `<button class="pg-btn" onclick="goPage(${curPage+1})" ${curPage===totalPages?'disabled':''}>›</button>`;
    
    const btns = document.getElementById('paginationBtns');
    if(btns) {
        btns.innerHTML = paginationHTML;
    }
}

function goPage(p) {
    const totalPages = Math.ceil(filtered.length / PER);
    if (p < 1 || p > totalPages) return;
    curPage = p;
    renderTable();
}

function exportData() {
    if (!filtered.length) {
        showToast('error', 'No data to export');
        return;
    }
    
    const headers = ['#', 'Name', 'Reg No', 'Hostel', 'Meal', 'Date', 'Amount', 'Status'];
    const rows = filtered.map((r, i) => [
        i + 1, r.name, r.reg, r.hostel, r.meal, r.date || r.dateStr || r.created_at, r.amount, r.status
    ]);
    
    const csv = [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('success', 'CSV exported successfully');
}

/* ── FEEDBACK ── */
async function loadFeedback() {
    try {
        const { data, error } = await window.supabaseClient
            .from('mess_feedback')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        window_feedbacks = data || [];
        renderRecentFeedback();
        renderAllFeedback();
    } catch (err) {
        console.error('⚠️ Feedback load failed:', err);
    }
}

function renderRecentFeedback() {
    const container = document.getElementById('recentFeedbackList');
    if (!container) return;
    
    const data = (window_feedbacks || []).slice(0, 3);
    
    if (!data.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No feedback yet</p></div>';
        return;
    }
    
    container.innerHTML = data.map(f => 
        `<div class="feedback-item">
            <div class="feedback-meta">
                <div>
                    <div class="feedback-author">${f.name || 'Anonymous'} <span style="color:var(--muted);font-weight:400;">(${f.reg || 'N/A'})</span></div>
                    <div class="feedback-date">${f.hostel || 'N/A'} • ${f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Recent'}</div>
                </div>
                <div class="feedback-stars">${'★'.repeat(f.rating || 0)}${'☆'.repeat(5 - (f.rating || 0))}</div>
            </div>
            <div class="feedback-text">${f.text || f.feedback_text || ''}</div>
        </div>`
    ).join('');
}

function renderAllFeedback() {
    const container = document.getElementById('allFeedbackList');
    if (!container) return;
    
    const data = window_feedbacks || [];
    
    if (!data.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No feedback yet</p></div>';
        return;
    }
    
    container.innerHTML = data.map(f => 
        `<div class="feedback-item">
            <div class="feedback-meta">
                <div>
                    <div class="feedback-author">${f.name || 'Anonymous'} <span style="color:var(--muted);font-weight:400;">(${f.reg || 'N/A'})</span></div>
                    <div class="feedback-date">${f.hostel || 'N/A'} • ${f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Recent'}</div>
                </div>
                <div class="feedback-stars">${'★'.repeat(f.rating || 0)}${'☆'.repeat(5 - (f.rating || 0))}</div>
            </div>
            <div class="feedback-text">${f.text || f.feedback_text || ''}</div>
        </div>`
    ).join('');
}

async function clearAllFeedback() {
    if (!(window_feedbacks || []).length) {
        showToast('warning', 'Already empty', 'No feedback to clear');
        return;
    }
    
    showCustomModal({
        title: 'Delete All Feedback',
        message: `Are you sure you want to delete all ${window_feedbacks.length} feedback records? This cannot be undone.`,
        type: 'danger',
        confirmText: 'Yes, Delete All',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
            try {
                const { error } = await window.supabaseClient
                    .from('mess_feedback')
                    .delete()
                    .neq('id', 0);
                
                if (error) throw error;
                
                window_feedbacks = [];
                renderAllFeedback();
                renderRecentFeedback();
                showToast('success', 'All feedback cleared');
            } catch (err) {
                console.error('Error clearing feedback:', err);
                showToast('error', 'Failed to clear feedback');
            }
        }
    });
}

/* ── TABS ── */
function switchTab(tabName){
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event?.target?.closest?.('.tab-btn')?.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if(tabName === 'overview'){
        renderMealCounts();
        renderMenu();
        renderRecentFeedback();
    }
    if(tabName === 'attendance') {
        curPage = 1;
        renderTable();
    }
    if(tabName === 'feedback') renderAllFeedback();
}

/* ── TOAST & UTILS ── */
function showToast(type, message, title = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
        <div class="toast-message">${title ? `<strong>${title}</strong><br>` : ''}${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ── CUSTOM MODAL ── */
let customModalCallback = null;

function showCustomModal(options = {}) {
    const {
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        type = 'warning',
        confirmText = 'Confirm',
        confirmClass = 'btn-danger',
        onConfirm = null
    } = options;
    
    const modal = document.getElementById('customModal');
    const icon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    const icons = {
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        danger: '<i class="fas fa-trash-alt"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    
    icon.className = `custom-modal-icon ${type}`;
    icon.innerHTML = icons[type] || icons.warning;

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${confirmClass}`;

    customModalCallback = onConfirm;
    modal.classList.add('show');
}

function closeCustomModal() {
    document.getElementById('customModal').classList.remove('show');
    customModalCallback = null;
}

function confirmCustomAction() {
    if (customModalCallback) {
        customModalCallback();
    }
    closeCustomModal();
}

/* ── HEADER/SIDEBAR ── */
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('visible');
}

function toggleProfileDropdown() {
    document.getElementById('profileDropdown').classList.toggle('open');
}

function handleLogout(e) {
    e.preventDefault();
    showCustomModal({
        title: 'Logout Confirmation',
        message: 'Are you sure you want to logout?',
        type: 'info',
        confirmText: 'Yes, Logout',
        confirmClass: 'btn-primary',
        onConfirm: () => {
            window.location.href = 'sign-in.html';
        }
    });
}

/* ── INIT (duplicate removed — initApp is already defined above) ── */

/* ── GLOBAL FUNCTION EXPOSURE ── */
// This ensures HTML buttons (onclick) can find these functions
window.switchTab = switchTab;
window.toggleSidebar = toggleSidebar;
window.toggleProfileDropdown = toggleProfileDropdown;
window.handleLogout = handleLogout;
window.exportData = exportData;
window.resetFilters = resetFilters;
window.applyFilters = applyFilters;
window.goPage = goPage;
window.addDishItem = addDishItem;
window.selectDay = selectDay;
window.switchMealType = switchMealType;
window.removeMenuItem = removeMenuItem;
window.showSaveMenuModal = showSaveMenuModal;
window.closeSaveMenuModal = closeSaveMenuModal;
window.confirmSaveMenu = confirmSaveMenu;
window.confirmCustomAction = confirmCustomAction;
window.closeCustomModal = closeCustomModal;