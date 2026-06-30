// ============================================================
// 🎓 SmartDormX - Student Directory (v3 - Real Room Layouts)
// ============================================================

// ========== 🏠 HOSTEL CONFIG ==========
const hostelData = [
    { name: "Hostel A",        type: "Boys",  icon: "👨‍🎓", code: "A" },
    { name: "Hostel B",        type: "Girls", icon: "👩‍🎓", code: "B" },
    { name: "Hostel C",        type: "Boys",  icon: "👨‍🎓", code: "C" },
    { name: "Railway Hostel",  type: "Boys",  icon: "🚂",   code: "R" },
    { name: "School Building", type: "Girls", icon: "🏫",   code: "S" },
];

// ========== 🏠 ROOM LAYOUT BUILDERS ==========
function buildHostelABRooms(hostelCode) {
    // Ground: 101-111 (rooms), 112 washroom, 113 warden, 114 electrical, 115 mess, 116 & 116.1 common
    const rooms = [];
    const p = hostelCode + '-';
    
    // Ground floor
    for (let i = 101; i <= 111; i++) rooms.push({ num: p+i, floor:'Ground', type:'room', cap:3 });
    rooms.push({ num: p+'112', floor:'Ground', type:'washroom' });
    rooms.push({ num: p+'113', floor:'Ground', type:'warden' });
    rooms.push({ num: p+'114', floor:'Ground', type:'electrical' });
    rooms.push({ num: p+'115', floor:'Ground', type:'mess' });
    rooms.push({ num: p+'116', floor:'Ground', type:'common' });
    rooms.push({ num: p+'116.1', floor:'Ground', type:'common' });

    // First floor
    for (let i = 201; i <= 213; i++) rooms.push({ num: p+i, floor:'First', type:'room', cap:3 });
    rooms.push({ num: p+'214', floor:'First', type:'washroom' });
    for (let i = 215; i <= 228; i++) rooms.push({ num: p+i, floor:'First', type:'room', cap:3 });
    rooms.push({ num: p+'229', floor:'First', type:'washroom' });
    rooms.push({ num: p+'230', floor:'First', type:'room', cap:3 });
    rooms.push({ num: p+'231', floor:'First', type:'room', cap:3 });

    // Second floor
    for (let i = 301; i <= 313; i++) rooms.push({ num: p+i, floor:'Second', type:'room', cap:3 });
    rooms.push({ num: p+'314', floor:'Second', type:'washroom' });
    for (let i = 315; i <= 328; i++) rooms.push({ num: p+i, floor:'Second', type:'room', cap:3 });
    rooms.push({ num: p+'329', floor:'Second', type:'washroom' });
    rooms.push({ num: p+'330', floor:'Second', type:'room', cap:3 });
    rooms.push({ num: p+'331', floor:'Second', type:'room', cap:3 });
    return rooms;
}

function buildHostelCRooms() {
    const rooms = [];
    for (let i = 1;   i <= 37;  i++) rooms.push({ num:'CB-'+i, floor:'Basement', type:'room', cap:3 });
    for (let i = 101; i <= 132; i++) rooms.push({ num:'CG-'+i, floor:'Ground',   type:'room', cap:3 });
    for (let i = 201; i <= 235; i++) rooms.push({ num:'CF-'+i, floor:'First',    type:'room', cap:3 });
    for (let i = 301; i <= 337; i++) rooms.push({ num:'CS-'+i, floor:'Second',   type:'room', cap:3 });
    for (let i = 401; i <= 437; i++) rooms.push({ num:'CT-'+i, floor:'Third',    type:'room', cap:3 });
    return rooms;
}

function buildRailwayRooms() {
    const rooms = [];
    for (let i = 1;  i <= 10; i++) rooms.push({ num:'G-'+i,  floor:'Ground', type:'room', cap:3 });
    for (let i = 11; i <= 20; i++) rooms.push({ num:'F-'+i,  floor:'First',  type:'room', cap:3 });
    for (let i = 11; i <= 20; i++) rooms.push({ num:'S-'+i,  floor:'Second', type:'room', cap:3 });
    return rooms;
}

function buildSchoolRooms() {
    const rooms = [];
    for (let i = 1; i <= 17; i++) rooms.push({ num:'G-'+i, floor:'Ground', type:'room', cap:3 });
    for (let i = 1; i <= 7;  i++) rooms.push({ num:'F-'+i, floor:'First',  type:'room', cap:3 });
    for (let i = 1; i <= 17; i++) rooms.push({ num:'S-'+i, floor:'Second', type:'room', cap:3 });
    return rooms;
}

function getHostelRooms(hostelName) {
    if (hostelName === 'Hostel A') return buildHostelABRooms('A');
    if (hostelName === 'Hostel B') return buildHostelABRooms('B');
    if (hostelName === 'Hostel C') return buildHostelCRooms();
    if (hostelName === 'Railway Hostel') return buildRailwayRooms();
    if (hostelName === 'School Building') return buildSchoolRooms();
    return [];
}

function getValidRoomNumbers(hostelName) {
    return getHostelRooms(hostelName).filter(r => r.type === 'room').map(r => r.num);
}

// ========== 🌐 GLOBAL STATE ==========
let studentsData = [];
let currentView = 'hostels';
let currentHostel = null;
let editingStudentId = null;
let currentStudentId = null;
let searchTimeout;

// ========== 🚀 INIT ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎓 SmartDormX Student Directory v3');
    await loadStudentsData();
    renderHostels();
    ensureToastContainer();
    document.addEventListener('click', function(e) {
        const sc = document.querySelector('.search-section');
        const rd = document.getElementById('searchResults');
        if (rd && sc && !sc.contains(e.target)) rd.classList.remove('active');
    });
});

function ensureToastContainer() {
    if (!document.getElementById('toastContainer')) {
        const c = document.createElement('div');
        c.id = 'toastContainer'; c.className = 'toast-container';
        document.body.appendChild(c);
    }
}

function getFromStorage(key, def) {
    try { const i = localStorage.getItem(key); return i ? JSON.parse(i) : def; }
    catch(e){ return def; }
}
function saveStudentsData() {
    try { localStorage.setItem('smartdormx_students', JSON.stringify(studentsData)); } catch(e){}
}

// ========== 🗄️ SUPABASE ==========
const SupabaseHelpers = {
    async getStudents() {
        try {
            const { data, error } = await window.supabaseClient
                .from('students').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data.map(r => ({
                id: r.id, firstName: r.first_name, lastName: r.last_name, regNo: r.reg_no,
                email: r.email, phone: r.phone, gender: r.gender, bloodGroup: r.blood_group,
                hostel: r.hostel, room: r.room, program: r.program,
                guardian: r.guardian_name, guardianPhone: r.guardian_phone,
                address: r.address, city: r.city, postalCode: r.postal_code, country: r.country,
                disability: r.disability, disabilityDetails: r.disability_details,
                dob: r.date_of_birth, cnic: r.cnic, photo: r.photo_url, joiningDate: r.joining_date
            }));
        } catch(err){ console.error(err); return []; }
    },
    async addStudent(d) {
        try {
            const { data, error } = await window.supabaseClient.from('students').insert([d]).select();
            if (error) throw error;
            return { success:true, data:data[0] };
        } catch(err){ return { success:false, error:err.message }; }
    },
    async updateStudent(id, d) {
        try {
            const { data, error } = await window.supabaseClient.from('students').update(d).eq('id',id).select();
            if (error) throw error;
            return { success:true, data:data[0] };
        } catch(err){ return { success:false, error:err.message }; }
    },
    async deleteStudent(id) {
        try {
            const { error } = await window.supabaseClient.from('students').delete().eq('id', id);
            if (error) throw error;
            return { success:true };
        } catch(err){ return { success:false, error:err.message }; }
    }
};
window.SupabaseHelpers = SupabaseHelpers;

async function loadStudentsData() {
    try {
        const data = await SupabaseHelpers.getStudents();
        studentsData = data || [];
        renderHostels();
        if (currentView === 'rooms' && currentHostel) showRooms(currentHostel);
    } catch(err){
        studentsData = getFromStorage('smartdormx_students', []);
        renderHostels();
    }
}

// ========== 🔔 TOAST ==========
function showToast(type, title, message) {
    ensureToastContainer();
    const c = document.getElementById('toastContainer');
    const ic = { success:'fas fa-check-circle', error:'fas fa-exclamation-circle', warning:'fas fa-exclamation-triangle', info:'fas fa-info-circle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="${ic[type]||ic.info} toast-icon"></i><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="this.closest('.toast').remove()"><i class="fas fa-times"></i></button>`;
    c.appendChild(t);
    setTimeout(() => { if(t.parentNode){ t.style.animation='fadeOut .3s ease forwards'; setTimeout(()=>t.remove(),300); }}, 5000);
}
function showSuccessToast(t,m){ showToast('success',t,m); }
function showErrorToast(t,m){ showToast('error',t,m); }
function showWarningToast(t,m){ showToast('warning',t,m); }

// ========== ✅ VALIDATION ==========
function validateRegNo(r){ return /^B\d{2}[FS]\d{4}[A-Z]{2,4}\d{2,4}$/i.test(r); }
function validateEmail(e){ return e && e.toLowerCase().endsWith('@gmail.com'); }
function validatePhone(p){ if(!p) return false; const d=p.replace(/\D/g,''); return d.length===11 && d.startsWith('0'); }
function validateName(n){ return n && n.trim().length>=2; }
function validateCnic(c){ if(!c) return true; return /^[0-9]{5}-[0-9]{7}-[0-9]$/.test(c); }
function getHostelType(n){ const h=hostelData.find(x=>x.name===n); return h?h.type:''; }
function getHostelCode(n){ const h=hostelData.find(x=>x.name===n); return h?h.code:''; }

function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

// ========== 🎨 RENDER HOSTELS ==========
function renderHostels() {
    const grid = document.getElementById('hostelGrid');
    if (!grid) return;

    grid.innerHTML = hostelData.map(h => {
        const rooms = getHostelRooms(h.name);
        const roomsOnly = rooms.filter(r => r.type === 'room');
        const totalRooms = roomsOnly.length;
        const totalCapacity = roomsOnly.reduce((s,r)=>s+(r.cap||3), 0);
        const occupants = studentsData.filter(s => s.hostel === h.name).length;
        const pct = totalCapacity ? Math.round((occupants/totalCapacity)*100) : 0;
        const color = pct>=90 ? '#ef4444' : pct>=70 ? '#f59e0b' : '#10b981';

        return `
            <div class="hostel-card-new" onclick="showRooms('${h.name}')">
                <div class="hostel-icon">${h.icon}</div>
                <h3 class="hostel-name">${h.name}</h3>
                <p class="hostel-type">${h.type} Hostel</p>
                <div class="hostel-stats">
                    <div class="stat-item"><span class="stat-label">Capacity</span><span class="stat-value">${totalCapacity}</span></div>
                    <div class="stat-item"><span class="stat-label">Occupied</span><span class="stat-value">${occupants}</span></div>
                    <div class="stat-item"><span class="stat-label">Rooms</span><span class="stat-value">${totalRooms}</span></div>
                </div>
                <div class="occupancy-bar"><div class="occupancy-fill" style="width:${pct}%;background:${color}"></div></div>
                <p class="occupancy-text" style="color:${color}">${pct}% Full</p>
            </div>`;
    }).join('');
}

// ========== 🏠 SHOW ROOMS ==========
function showRooms(hostelName) {
    currentHostel = hostelName;
    currentView = 'rooms';
    document.getElementById('hostel-view').style.display = 'none';
    document.getElementById('room-view').style.display = 'block';
    document.getElementById('selected-title').textContent = `${hostelName} - Rooms`;

    const allRooms = getHostelRooms(hostelName);
    const hostelStudents = studentsData.filter(s => s.hostel === hostelName);

    const roomsMap = {};
    hostelStudents.forEach(s => {
        if (!roomsMap[s.room]) roomsMap[s.room] = [];
        roomsMap[s.room].push(s);
    });

    const roomsOnly = allRooms.filter(r => r.type === 'room');
    const occupiedRooms = roomsOnly.filter(r => roomsMap[r.num]?.length > 0).length;
    document.getElementById('room-count').textContent = `${occupiedRooms}/${roomsOnly.length} Rooms Occupied`;

    // Group by floor
    const floors = {};
    allRooms.forEach(r => {
        if (!floors[r.floor]) floors[r.floor] = [];
        floors[r.floor].push(r);
    });

    const floorOrder = ['Basement','Ground','First','Second','Third'];
    let html = '';
    floorOrder.forEach(fl => {
        if (!floors[fl]) return;
        html += `<h3 style="grid-column:1/-1; margin:24px 0 12px; font-size:18px; color:#1e293b; font-weight:700; padding-bottom:8px; border-bottom:2px solid #e2e8f0;">📍 ${fl} Floor</h3>`;
        floors[fl].forEach(rm => {
            html += renderRoomCard(rm, roomsMap[rm.num] || []);
        });
    });

    document.getElementById('roomGrid').innerHTML = html;
}

function renderRoomCard(room, occupants) {
    // Non-room facilities (washroom, warden, etc.)
    if (room.type !== 'room') {
        const labels = {
            washroom:{ icon:'🚻', label:'Washroom',    bg:'#dbeafe', color:'#1e40af' },
            warden:  { icon:'👔', label:'Warden Room', bg:'#fef3c7', color:'#92400e' },
            electrical:{ icon:'⚡', label:'Electrical', bg:'#fee2e2', color:'#991b1b' },
            mess:    { icon:'🍽️', label:'Mess Hall',   bg:'#dcfce7', color:'#166534' },
            common:  { icon:'🛋️', label:'Common Room', bg:'#f3e8ff', color:'#6b21a8' }
        };
        const l = labels[room.type] || { icon:'🏛️', label:room.type, bg:'#f1f5f9', color:'#475569' };
        return `<div class="room-card-new" style="cursor:default; border-top:4px solid ${l.color}; opacity:0.85;">
            <div class="room-card-header" style="background:${l.bg};">
                <div class="room-number-badge" style="font-size:1.3rem;">${escapeHtml(room.num)}</div>
                <span class="room-status-badge" style="background:white; color:${l.color};">${l.icon} ${l.label}</span>
            </div>
            <div class="room-card-body" style="min-height:80px;">
                <div class="no-occupants"><i class="fas fa-info-circle" style="color:${l.color};"></i><span>${l.label}</span></div>
            </div>
        </div>`;
    }

    // Real rooms
    const cap = room.cap || 3;
    const occ = occupants.length;
    let statusClass = 'vacant', statusText = 'Vacant';
    if (occ > 0 && occ < cap) { statusClass = 'partial'; statusText = `${occ} Student${occ>1?'s':''}`; }
    else if (occ >= cap) { statusClass = 'occupied'; statusText = 'Full'; }

    return `<div class="room-card-new ${statusClass}" onclick="${occ>0 ? `handleRoomClick('${room.num}')` : ''}" style="${occ===0?'cursor:default;':''}">
        <div class="room-card-header">
            <div class="room-number-badge">${escapeHtml(room.num)}</div>
            <span class="room-status-badge">${statusText}</span>
        </div>
        <div class="room-card-body">
            ${occ>0 ? `<div class="room-occupants-list">
                ${occupants.map(s => `<div class="occupant-mini">
                    <div class="occupant-mini-avatar">${(s.firstName[0]+(s.lastName?s.lastName[0]:'')).toUpperCase()}</div>
                    <span>${escapeHtml(s.firstName)} ${escapeHtml(s.lastName||'')}</span>
                </div>`).join('')}
            </div>` : '<div class="no-occupants"><i class="fas fa-bed"></i><span>No occupants</span></div>'}
        </div>
        <div class="room-card-footer">
            <span class="capacity-badge">${occ}/${cap} Students</span>
        </div>
    </div>`;
}

function handleRoomClick(roomNumber) {
    const r = studentsData.filter(s => s.room===roomNumber && s.hostel===currentHostel);
    if (r.length===0) return;
    if (r.length===1) showProfile(r[0].id);
    else showRoomOccupants(roomNumber, r);
}

function showRoomOccupants(roomNumber, students) {
    const modal = document.getElementById('profileModal');
    document.getElementById('modalTitle').textContent = `Room ${roomNumber} - ${students.length} Occupants`;
    document.getElementById('profileDetails').innerHTML = `
        <div style="padding:32px;">
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:20px;">
                ${students.map(s => `<div onclick="showProfile(${s.id})" style="background:#f8fafc;padding:20px;border-radius:14px;border:1px solid #e2e8f0;cursor:pointer;display:flex;align-items:center;gap:16px;">
                    <div class="profile-avatar-large" style="width:70px;height:70px;font-size:24px;border:none;">${(s.firstName[0]+(s.lastName?s.lastName[0]:'')).toUpperCase()}</div>
                    <div><h4 style="margin-bottom:6px;">${escapeHtml(s.firstName)} ${escapeHtml(s.lastName||'')}</h4>
                        <p style="font-size:13px;color:#64748b;">${s.regNo}</p>
                        <p style="font-size:13px;color:#64748b;">${escapeHtml(s.program||'')}</p>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    modal.style.display = 'block';
    setTimeout(()=>modal.classList.add('show'),10);
}

// ========== ➕ ADD/EDIT ==========
function openAddStudentModal() {
    editingStudentId = null;
    const modal = document.getElementById('addEditModal');
    document.getElementById('addEditTitle').textContent = 'Add New Student';
    document.getElementById('addEditForm').innerHTML = getStudentFormHTML();
    modal.style.display = 'block';
    setTimeout(()=>modal.classList.add('show'),10);
}

function getStudentFormHTML(student = null) {
    const isEdit = !!student;
    return `<div class="add-student-form-container">
        <form id="studentForm" onsubmit="saveStudent(event)" class="form-grid" novalidate>
            <div class="form-group"><label class="form-label">First Name <span class="required">*</span></label>
                <input type="text" id="fFirstName" class="form-input" value="${escapeHtml(student?.firstName||'')}" placeholder="e.g., Fahad" required>
                <div class="form-error" id="error-firstName"></div></div>
            <div class="form-group"><label class="form-label">Last Name</label>
                <input type="text" id="fLastName" class="form-input" value="${escapeHtml(student?.lastName||'')}" placeholder="Optional"></div>
            <div class="form-group"><label class="form-label">Reg Number <span class="required">*</span></label>
                <input type="text" id="fRegNo" class="form-input" value="${escapeHtml(student?.regNo||'')}" placeholder="B24F0403CS245" required>
                <div class="form-error" id="error-regNo"></div></div>
            <div class="form-group"><label class="form-label">CNIC</label>
                <input type="text" id="fCnic" class="form-input" value="${escapeHtml(student?.cnic||'')}" placeholder="12345-1234567-1"></div>
            <div class="form-group"><label class="form-label">Date of Birth</label>
                <input type="date" id="fDob" class="form-input" value="${student?.dob||''}"></div>
            <div class="form-group"><label class="form-label">Gender <span class="required">*</span></label>
                <select id="fGender" class="form-select" required onchange="validateHostelGender()">
                    <option value="">Select</option>
                    <option ${student?.gender==='Male'?'selected':''}>Male</option>
                    <option ${student?.gender==='Female'?'selected':''}>Female</option>
                    <option ${student?.gender==='Other'?'selected':''}>Other</option>
                </select><div class="form-error" id="error-gender"></div></div>
            <div class="form-group"><label class="form-label">Phone <span class="required">*</span></label>
                <input type="tel" id="fPhone" class="form-input" value="${escapeHtml(student?.phone||'')}" placeholder="03xxxxxxxxx" required>
                <div class="form-error" id="error-phone"></div></div>
            <div class="form-group"><label class="form-label">Email <span class="required">*</span></label>
                <input type="email" id="fEmail" class="form-input" value="${escapeHtml(student?.email||'')}" placeholder="x@gmail.com" required>
                <div class="form-error" id="error-email"></div></div>
            <div class="form-group"><label class="form-label">Blood Group <span class="required">*</span></label>
                <select id="fBloodGroup" class="form-select" required>
                    <option value="">Select</option>
                    ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b=>`<option ${student?.bloodGroup===b?'selected':''}>${b}</option>`).join('')}
                </select></div>
            <div class="form-group"><label class="form-label">Guardian Name <span class="required">*</span></label>
                <input type="text" id="fGuardian" class="form-input" value="${escapeHtml(student?.guardian||'')}" required>
                <div class="form-error" id="error-guardian"></div></div>
            <div class="form-group"><label class="form-label">Guardian Phone <span class="required">*</span></label>
                <input type="tel" id="fGuardianPhone" class="form-input" value="${escapeHtml(student?.guardianPhone||'')}" required>
                <div class="form-error" id="error-guardianPhone"></div></div>
            <div class="form-group"><label class="form-label">Disability?</label>
                <select id="fDisability" class="form-select" onchange="toggleDisabilityField()">
                    <option value="No" ${(!student?.disability||student.disability==='None')?'selected':''}>No</option>
                    <option value="Yes" ${(student?.disability&&student.disability!=='None')?'selected':''}>Yes</option>
                </select></div>
            <div class="form-group" id="disabilityDetailsGroup" style="${(student?.disability&&student.disability!=='None')?'':'display:none'}">
                <label class="form-label">Disability Details</label>
                <input type="text" id="fDisabilityDetails" class="form-input" value="${escapeHtml((student?.disability&&student.disability!=='None')?student.disability:'')}"></div>
            <div class="form-group full-width"><label class="form-label">Address <span class="required">*</span></label>
                <input type="text" id="fAddress" class="form-input" value="${escapeHtml(student?.address||'')}" required></div>
            <div class="form-group"><label class="form-label">City <span class="required">*</span></label>
                <input type="text" id="fCity" class="form-input" value="${escapeHtml(student?.city||'')}" required></div>
            <div class="form-group"><label class="form-label">Postal Code <span class="required">*</span></label>
                <input type="text" id="fPostalCode" class="form-input" value="${escapeHtml(student?.postalCode||'')}" required></div>
            <div class="form-group"><label class="form-label">Country <span class="required">*</span></label>
                <input type="text" id="fCountry" class="form-input" value="${escapeHtml(student?.country||'')}" required></div>
            <div class="form-group"><label class="form-label">Hostel <span class="required">*</span></label>
                <select id="fHostel" class="form-select" required onchange="validateHostelGender(); populateRoomDropdown();">
                    <option value="">Select Hostel</option>
                    ${hostelData.map(h=>`<option value="${h.name}" ${student?.hostel===h.name?'selected':''}>${h.name} (${h.type})</option>`).join('')}
                </select><div class="form-error" id="error-hostel"></div></div>
            <div class="form-group"><label class="form-label">Room Number <span class="required">*</span></label>
                <select id="fRoom" class="form-select" required>
                    <option value="">Select hostel first</option>
                </select><div class="form-error" id="error-room"></div></div>
            <div class="form-group full-width"><label class="form-label">Program <span class="required">*</span></label>
                <input type="text" id="fProgram" class="form-input" value="${escapeHtml(student?.program||'')}" placeholder="e.g., BS Computer Science" required></div>
            <div class="form-actions">
                <button type="submit" class="btn-save">${isEdit?'Update Student':'Save Student'}</button>
                <button type="button" class="btn-cancel" onclick="closeAddEditModal()">Cancel</button>
            </div>
        </form></div>`;
}

function populateRoomDropdown() {
    const hostel = document.getElementById('fHostel').value;
    const select = document.getElementById('fRoom');
    if (!hostel) { select.innerHTML = '<option value="">Select hostel first</option>'; return; }
    const validRooms = getValidRoomNumbers(hostel);
    const current = select.dataset.current || '';
    select.innerHTML = '<option value="">Select Room</option>' +
        validRooms.map(r => `<option value="${r}" ${r===current?'selected':''}>${r}</option>`).join('');
}

// Pre-fill room when editing
function prefillEditRoom(student) {
    if (!student?.room) return;
    const select = document.getElementById('fRoom');
    if (select) {
        select.dataset.current = student.room;
        populateRoomDropdown();
    }
}

function validateHostelGender() {
    const g = document.getElementById('fGender')?.value;
    const h = document.getElementById('fHostel')?.value;
    const e = document.getElementById('error-hostel');
    if (!g || !h) return true;
    const t = getHostelType(h);
    if (t==='Boys' && g!=='Male')   { if(e){e.textContent='⚠️ Boys hostel only'; e.classList.add('show');} return false; }
    if (t==='Girls' && g!=='Female'){ if(e){e.textContent='⚠️ Girls hostel only';e.classList.add('show');} return false; }
    if (e){ e.textContent=''; e.classList.remove('show'); }
    return true;
}

function toggleDisabilityField() {
    const s = document.getElementById('fDisability');
    const g = document.getElementById('disabilityDetailsGroup');
    const i = document.getElementById('fDisabilityDetails');
    if (!s||!g||!i) return;
    if (s.value==='Yes') g.style.display='block';
    else { g.style.display='none'; i.value=''; }
}

function showError(id,msg){ const e=document.getElementById(id); if(e){e.textContent=msg; e.classList.add('show');}}
function clearError(id){ const e=document.getElementById(id); if(e){e.textContent=''; e.classList.remove('show');}}

function validateForm() {
    let ok = true;
    const fn = document.getElementById('fFirstName').value.trim();
    if(!validateName(fn)){ showError('error-firstName','At least 2 chars'); ok=false; } else clearError('error-firstName');
    const reg = document.getElementById('fRegNo').value.trim().toUpperCase();
    if(!validateRegNo(reg)){ showError('error-regNo','Format: B24F0403CS245'); ok=false; } else clearError('error-regNo');
    const ph = document.getElementById('fPhone').value;
    if(!validatePhone(ph)){ showError('error-phone','11 digits, starts with 0'); ok=false; } else clearError('error-phone');
    const em = document.getElementById('fEmail').value;
    if(!validateEmail(em)){ showError('error-email','Must be @gmail.com'); ok=false; } else clearError('error-email');
    const gd = document.getElementById('fGuardian').value.trim();
    if(!validateName(gd)){ showError('error-guardian','At least 2 chars'); ok=false; } else clearError('error-guardian');
    const gp = document.getElementById('fGuardianPhone').value;
    if(!validatePhone(gp)){ showError('error-guardianPhone','11 digits, starts with 0'); ok=false; } else clearError('error-guardianPhone');
    const ho = document.getElementById('fHostel').value;
    if(!ho){ showError('error-hostel','Select hostel'); ok=false; }
    else { clearError('error-hostel'); if(!validateHostelGender()) ok=false; }
    const rm = document.getElementById('fRoom').value;
    if(!rm){ showError('error-room','Select room'); ok=false; } else clearError('error-room');
    return ok;
}

async function saveStudent(event) {
    event.preventDefault();
    if (!validateForm()) return;
    const dis = document.getElementById('fDisability').value;
    const disDet = document.getElementById('fDisabilityDetails')?.value.trim() || '';
    const formData = {
        reg_no: document.getElementById('fRegNo').value.trim().toUpperCase(),
        first_name: document.getElementById('fFirstName').value.trim(),
        last_name: document.getElementById('fLastName').value.trim() || null,
        email: document.getElementById('fEmail').value.trim(),
        phone: document.getElementById('fPhone').value.trim(),
        gender: document.getElementById('fGender').value,
        blood_group: document.getElementById('fBloodGroup').value || null,
        hostel: document.getElementById('fHostel').value,
        room: document.getElementById('fRoom').value,
        program: document.getElementById('fProgram').value.trim(),
        guardian_name: document.getElementById('fGuardian').value.trim(),
        guardian_phone: document.getElementById('fGuardianPhone').value.trim(),
        address: document.getElementById('fAddress').value.trim() || null,
        city: document.getElementById('fCity').value.trim() || null,
        postal_code: document.getElementById('fPostalCode').value.trim() || null,
        country: document.getElementById('fCountry').value.trim() || null,
        disability: dis==='Yes' ? (disDet||'Specified') : 'None',
        disability_details: dis==='Yes' ? (disDet||null) : null,
        date_of_birth: document.getElementById('fDob').value || null,
        cnic: document.getElementById('fCnic').value.trim() || null,
        photo_url: null
    };
    if (!editingStudentId) formData.joining_date = new Date().toISOString().split('T')[0];

    let result;
    if (editingStudentId) result = await SupabaseHelpers.updateStudent(editingStudentId, formData);
    else result = await SupabaseHelpers.addStudent(formData);

    if (result.success) {
        showSuccessToast(editingStudentId?'Updated':'Saved', `${formData.first_name} ${formData.last_name||''}`);
        closeAddEditModal();
        await loadStudentsData();
    } else showErrorToast('Save Failed', result.error||'Error');
}

function editStudent(id) {
    const s = studentsData.find(x => x.id===id);
    if (!s) return;
    editingStudentId = id;
    document.getElementById('addEditTitle').textContent = 'Edit Student';
    document.getElementById('addEditForm').innerHTML = getStudentFormHTML(s);
    const modal = document.getElementById('addEditModal');
    modal.style.display='block'; setTimeout(()=>modal.classList.add('show'),10);
    setTimeout(()=>prefillEditRoom(s), 50);
}

function showProfile(id) {
    const s = studentsData.find(x=>x.id===id);
    if (!s) return;
    currentStudentId = id;
    const modal = document.getElementById('profileModal');
    document.getElementById('modalTitle').textContent = 'Student Profile';
    const ini = (s.firstName[0]+(s.lastName?s.lastName[0]:'')).toUpperCase();
    document.getElementById('profileDetails').innerHTML = `
        <div class="student-profile-card">
            <div class="profile-header">
                <div class="profile-avatar-large">${ini||'ST'}</div>
                <div class="profile-title"><h2>${escapeHtml(s.firstName)} ${escapeHtml(s.lastName||'')}</h2>
                    <p class="profile-reg">${s.regNo} | ${s.gender}</p></div>
            </div>
            <div class="profile-body">
                <div class="profile-section"><h3>📚 Academic & Personal</h3><div class="info-grid">
                    <div class="info-item"><span class="info-label">Program</span><span class="info-value">${escapeHtml(s.program||'N/A')}</span></div>
                    <div class="info-item"><span class="info-label">DOB</span><span class="info-value">${s.dob||'N/A'}</span></div>
                    <div class="info-item"><span class="info-label">Blood</span><span class="info-value">${s.bloodGroup||'N/A'}</span></div>
                    ${s.cnic?`<div class="info-item"><span class="info-label">CNIC</span><span class="info-value">${s.cnic}</span></div>`:''}
                </div></div>
                <div class="profile-section"><h3>🏠 Hostel & Location</h3><div class="info-grid">
                    <div class="info-item"><span class="info-label">Hostel</span><span class="info-value">${escapeHtml(s.hostel||'N/A')}</span></div>
                    <div class="info-item"><span class="info-label">Room</span><span class="info-value">${escapeHtml(s.room||'N/A')}</span></div>
                    <div class="info-item"><span class="info-label">City</span><span class="info-value">${escapeHtml(s.city||'N/A')}</span></div>
                    <div class="info-item"><span class="info-label">Country</span><span class="info-value">${escapeHtml(s.country||'N/A')}</span></div>
                    <div class="info-item full-width"><span class="info-label">Address</span><span class="info-value">${escapeHtml(s.address||'N/A')}</span></div>
                </div></div>
                <div class="profile-section"><h3>📞 Contact & Guardian</h3><div class="info-grid">
                    <div class="info-item full-width"><span class="info-label">Email</span><span class="info-value">${escapeHtml(s.email||'N/A')}</span></div>
                    <div class="info-item"><span class="info-label">Phone</span><span class="info-value">${s.phone||'N/A'}</span></div>
                    <div class="info-item"><span class="info-label">Guardian</span><span class="info-value">${escapeHtml(s.guardian||'N/A')}</span></div>
                    <div class="info-item"><span class="info-label">Guardian Phone</span><span class="info-value">${s.guardianPhone||'N/A'}</span></div>
                    <div class="info-item full-width"><span class="info-label">Medical</span><span class="info-value">${escapeHtml(s.disability||'None')}</span></div>
                </div></div>
            </div>
            <div class="profile-actions">
                <button class="btn-edit" onclick="editStudent(${s.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-delete" onclick="initiateDelete(${s.id})"><i class="fas fa-trash-alt"></i> Delete</button>
                <button class="btn-secondary" onclick="closeProfile()"><i class="fas fa-times"></i> Close</button>
            </div>
        </div>`;
    modal.style.display='block'; setTimeout(()=>modal.classList.add('show'),10);
}

function closeProfile() {
    const m = document.getElementById('profileModal');
    m.classList.remove('show');
    setTimeout(()=>{ m.style.display='none'; document.getElementById('profileDetails').innerHTML=''; }, 300);
}
function closeAddEditModal() {
    const m = document.getElementById('addEditModal');
    m.classList.remove('show');
    setTimeout(()=>{ m.style.display='none'; document.getElementById('addEditForm').innerHTML=''; editingStudentId=null; }, 300);
}

// ========== 🗑️ DELETE ==========
function initiateDelete(id=null) {
    const target = id || currentStudentId;
    if (!target) return;
    const s = studentsData.find(x=>x.id===target);
    if (!s) return;
    currentStudentId = target;
    const m = document.getElementById('deleteModal');
    document.getElementById('deleteStudentName').textContent = `${s.firstName} ${s.lastName||''}`;
    document.getElementById('deleteStudentReg').textContent = s.regNo;
    document.getElementById('deleteReason').value = '';
    document.getElementById('otherReasonText').value = '';
    document.getElementById('otherReasonBox').style.display = 'none';
    document.getElementById('confirmDelete').checked = false;
    document.getElementById('confirmDeleteBtn').disabled = true;
    const pm = document.getElementById('profileModal');
    if (pm.style.display==='block') closeProfile();
    setTimeout(()=>{ m.style.display='block'; setTimeout(()=>m.classList.add('show'),10); }, 100);
}

function handleReasonChange() {
    const r = document.getElementById('deleteReason').value;
    document.getElementById('otherReasonBox').style.display = r==='other' ? 'block' : 'none';
    toggleDeleteButton();
}
function toggleDeleteButton() {
    const r = document.getElementById('deleteReason').value;
    const o = document.getElementById('otherReasonText').value.trim();
    const c = document.getElementById('confirmDelete').checked;
    let ok = r!=='' && c;
    if (r==='other') ok = ok && o!=='';
    document.getElementById('confirmDeleteBtn').disabled = !ok;
}

async function confirmDeleteStudent() {
    if (!currentStudentId) { closeDeleteModal(); return; }
    const s = studentsData.find(x=>x.id===currentStudentId);
    const nm = s ? `${s.firstName} ${s.lastName||''}` : 'Student';
    const r = await SupabaseHelpers.deleteStudent(currentStudentId);
    if (r.success) { showSuccessToast('Deleted', `${nm} removed`); await loadStudentsData(); }
    else showErrorToast('Delete Failed', r.error);
    closeDeleteModal();
    currentStudentId = null;
}

function closeDeleteModal() {
    const m = document.getElementById('deleteModal');
    m.classList.remove('show');
    setTimeout(()=>{ m.style.display='none'; }, 300);
}

// ========== 🔍 SEARCH ==========
function handleLiveSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const nq = document.getElementById('stuSearch').value.trim().toLowerCase();
        const rq = document.getElementById('roomSearch').value.trim();
        const rd = document.getElementById('searchResults');
        if (!nq && !rq) { rd.innerHTML=''; rd.classList.remove('active'); return; }
        let results = [...studentsData];
        if (nq) results = results.filter(s => {
            const fn = `${s.firstName} ${s.lastName||''}`.toLowerCase();
            return fn.includes(nq) || s.regNo.toLowerCase().includes(nq) || (s.program||'').toLowerCase().includes(nq);
        });
        if (rq) {
            const rqn = rq.toLowerCase().replace(/-/g,'');
            results = results.filter(s => s.room && s.room.toLowerCase().replace(/-/g,'').includes(rqn));
        }
        if (results.length===0) {
            rd.innerHTML = `<div class="search-header-label">Results</div><div style="padding:32px;text-align:center;color:#64748b;"><p>No students found</p></div>`;
        } else {
            rd.innerHTML = `<div class="search-header-label">${results.length} Found</div>` +
                results.slice(0,10).map(s => {
                    const ini = (s.firstName[0]+(s.lastName?s.lastName[0]:'')).toUpperCase();
                    return `<div class="search-result-card" onclick="openProfileFromSearch(${s.id})">
                        <div class="search-avatar">${ini}</div>
                        <div class="search-info"><h4 class="search-name">${escapeHtml(s.firstName)} ${escapeHtml(s.lastName||'')}</h4>
                            <div class="search-meta"><span><i class="fas fa-id-card"></i> ${s.regNo}</span>
                                <span><i class="fas fa-door-open"></i> ${escapeHtml(s.room||'')}</span>
                                <span><i class="fas fa-building"></i> ${escapeHtml(s.hostel||'')}</span></div></div>
                        <i class="fas fa-chevron-right"></i></div>`;
                }).join('');
        }
        rd.classList.add('active');
    }, 300);
}
function openProfileFromSearch(id) {
    showProfile(id);
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('stuSearch').value = '';
    document.getElementById('roomSearch').value = '';
}

function goBack() {
    document.getElementById('room-view').style.display = 'none';
    document.getElementById('hostel-view').style.display = 'block';
    currentView = 'hostels'; currentHostel = null;
}

function handleLogout(e) {
    e.preventDefault();
    if (confirm('Logout?')) window.location.href='sign-in.html';
}

// ========== 📊 EXPORT ==========
async function exportData() {
    if (typeof XLSX==='undefined') { alert('XLSX not loaded'); return; }
    if (!studentsData.length) { alert('No data'); return; }
    const exp = studentsData.map(s => ({
        'First Name':s.firstName,'Last Name':s.lastName||'','Reg No':s.regNo,'CNIC':s.cnic||'',
        'Gender':s.gender,'DOB':s.dob||'','Program':s.program,'Hostel':s.hostel,'Room':s.room,
        'Blood':s.bloodGroup,'Email':s.email,'Phone':s.phone,'City':s.city,'Country':s.country,
        'Address':s.address,'Guardian':s.guardian,'Guardian Phone':s.guardianPhone,'Medical':s.disability||'None'
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exp);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `SmartDormX_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccessToast('Exported', 'Excel file downloaded');
}

// ========== 🖱️ GLOBAL ==========
window.onclick = function(e) {
    const pm = document.getElementById('profileModal');
    const am = document.getElementById('addEditModal');
    const dm = document.getElementById('deleteModal');
    if (pm && e.target===pm) closeProfile();
    if (am && e.target===am) closeAddEditModal();
    if (dm && e.target===dm) closeDeleteModal();
};
document.addEventListener('keydown', function(e){
    if (e.key==='Escape'){ closeProfile(); closeAddEditModal(); closeDeleteModal(); }
});