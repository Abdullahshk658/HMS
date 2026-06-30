/**
 * SmartDormX - My Room Page
 * Production Ready with LocalStorage Backend
 * ✅ No Toast Notifications
 * ✅ Fee link to std-fee.html
 */

// ═══════════════════════════════════════════
// CONFIGURATION & HELPERS
// ═══════════════════════════════════════════

const HOSTEL_CODES = {
    'Hostel A': 'A',
    'Hostel B': 'B',
    'Hostel C': 'C',
    'Railway Hostel': 'R',
    'School Hostel': 'S'
  };
  
  const FLOOR_CODES = { 0: 'G', 1: 'F', 2: 'S' };
  const FLOOR_LABELS = { 'G': 'Ground', 'F': 'First', 'S': 'Second/Third' };
  
  function getHostelCode(name) {
    return HOSTEL_CODES[name] || 'A';
  }
  
  function getFloorCode(num) {
    return FLOOR_CODES[num] || 'G';
  }
  
  function getFloorLabel(code) {
    return FLOOR_LABELS[code] || code;
  }
  
  function generateRoomCode(hostel, floorNum, roomNum) {
    return `${getHostelCode(hostel)}${getFloorCode(floorNum)}-${String(roomNum).padStart(3, '0')}`;
  }
  
  function getSemesterRent(baseRent, semester) {
    const multipliers = { 1: 1, 2: 1, 3: 1.1, 4: 1.1, 5: 1.2, 6: 1.2, 7: 1.3, 8: 1.3 };
    return Math.round(baseRent * (multipliers[semester] || 1));
  }
  
  function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  
  function getOccupancyClass(occ, max) {
    const pct = (occ / max) * 100;
    return pct === 0 ? 'empty' : pct < 100 ? 'partial' : 'full';
  }
  
  function getOccupancyStatus(occ, max) {
    const pct = (occ / max) * 100;
    if (pct === 0) return { text: 'Available - Empty', dot: 'green' };
    if (pct < 50) return { text: 'Low Occupancy', dot: 'green' };
    if (pct < 100) return { text: 'Moderately Occupied', dot: 'orange' };
    return { text: 'Fully Occupied', dot: 'red' };
  }
  
  // ═══════════════════════════════════════════
  // LOCAL STORAGE INITIALIZATION
  // ═══════════════════════════════════════════
  
  function initLocalStorage() {
    if (localStorage.getItem('roomDataInitialized')) return;
  
    const student = {
      id: 'B22F0403CS046',
      name: 'Fahad Ali',
      email: 'fahad.ali@student.fh.de',
      program: 'BS CS',
      semester: 7
    };
  
    const myRoom = {
      roomCode: 'CF-225',
      hostel: 'Hostel C',
      floor: 'F',
      floorLabel: 'First',
      roomNumber: 225,
      baseRent: 15000,
      currentSemester: 7,
      paymentStatus: 'Pending',
      currentOccupancy: 2,
      maxCapacity: 3,
      roommates: [
        { name: 'Fahad Ali', program: 'BS CS', semester: 7, isCurrentUser: true },
        { name: 'Nabeel Ashraf', program: 'BS CS', semester: 5 },
        { name: 'Hammad Sheikh', program: 'BS CS', semester: 3 }
      ]
    };
  
    const rooms = [];
    const hostels = ['Hostel A', 'Hostel B', 'Hostel C', 'Railway Hostel', 'School Hostel'];
    let id = 1;
  
    hostels.forEach(h => {
      for (let f = 0; f <= 2; f++) {
        const startNum = f === 0 ? 101 : f === 1 ? 201 : 301;
        for (let n = 1; n <= 30; n++) {
          rooms.push({
            id: String(id++),
            roomCode: generateRoomCode(h, f, startNum + n - 1),
            hostel: h,
            floor: getFloorCode(f),
            floorLabel: getFloorLabel(getFloorCode(f)),
            roomNumber: startNum + n - 1,
            currentOccupancy: Math.floor(Math.random() * 4),
            maxCapacity: 3,
            baseRent: 13000 + Math.floor(Math.random() * 5) * 1000
          });
        }
      }
    });
  
    localStorage.setItem('studentData', JSON.stringify(student));
    localStorage.setItem('myRoomData', JSON.stringify(myRoom));
    localStorage.setItem('availableRoomsData', JSON.stringify(rooms));
    localStorage.setItem('roomDataInitialized', 'true');
  }
  
  // ═══════════════════════════════════════════
  // STATE & CORE LOGIC
  // ═══════════════════════════════════════════
  
  let appState = {
    myRoom: null,
    allRooms: [],
    filteredRooms: [],
    selectedRoom: null
  };
  
  function loadData() {
    appState.myRoom = JSON.parse(localStorage.getItem('myRoomData') || '{}');
    appState.allRooms = JSON.parse(localStorage.getItem('availableRoomsData') || '[]');
    appState.filteredRooms = [...appState.allRooms];
  }
  
  function renderMyRoom() {
    const r = appState.myRoom;
    if (!r || !r.roomCode) return;
  
    // Update rent display
    const semesterRent = getSemesterRent(r.baseRent, r.currentSemester);
    document.getElementById('roomRent').textContent = `PKR ${semesterRent.toLocaleString()}`;
    
    // Update hostel info
    document.getElementById('hostelName').textContent = r.hostel;
    document.getElementById('roomNumber').textContent = `Room ${r.roomCode}`;
    document.getElementById('roomDisplay').textContent = r.roomCode;
    
    // Update occupancy
    document.getElementById('occupiedNum').textContent = r.currentOccupancy;
    document.getElementById('totalNum').textContent = r.maxCapacity;
  
    // Update payment status
    const payEl = document.getElementById('paymentStatus');
    payEl.textContent = r.paymentStatus;
    payEl.className = r.paymentStatus === 'Paid' 
      ? 'info-value status-paid' 
      : 'info-value status-pending';
  
    // Update progress bar
    const pct = (r.currentOccupancy / r.maxCapacity) * 100;
    const fill = document.getElementById('mainProgressFill');
    fill.style.width = `${pct}%`;
    fill.className = `progress-fill ${getOccupancyClass(r.currentOccupancy, r.maxCapacity)}`;
  
    // Update occupancy status text
    const st = getOccupancyStatus(r.currentOccupancy, r.maxCapacity);
    document.getElementById('occupancyStatusText').innerHTML = 
      `<span class="status-dot ${st.dot}"></span><span>${st.text}</span>`;
  
    // Update roommates grid
    const grid = document.getElementById('roommatesGrid');
    const badge = document.getElementById('roommatesCount');
    if (badge) badge.textContent = `${r.roommates.length} Student${r.roommates.length !== 1 ? 's' : ''}`;
    
    grid.innerHTML = r.roommates.map(m => `
      <div class="roommate-card ${m.isCurrentUser ? 'is-you' : ''}">
        <div class="roommate-avatar">${getInitials(m.name)}</div>
        <div class="roommate-info">
          <strong>${escapeHtml(m.name)} ${m.isCurrentUser ? '<span class="roommate-tag">YOU</span>' : ''}</strong>
          <small>${escapeHtml(m.program)} - Semester ${m.semester}</small>
        </div>
      </div>
    `).join('');
  }
  
  function renderRooms(rooms) {
    const grid = document.getElementById('roomsGrid');
    const countEl = document.getElementById('resultsCount');
    
    countEl.textContent = `Showing ${rooms.length} room${rooms.length !== 1 ? 's' : ''}`;
  
    if (rooms.length === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h4>No rooms found</h4>
          <p>Try adjusting your search or filters</p>
        </div>
      `;
      return;
    }
  
    grid.innerHTML = rooms.map(r => {
      const avail = r.currentOccupancy < r.maxCapacity;
      const occClass = getOccupancyClass(r.currentOccupancy, r.maxCapacity);
      const pct = (r.currentOccupancy / r.maxCapacity) * 100;
      const st = getOccupancyStatus(r.currentOccupancy, r.maxCapacity);
      
      return `
        <div class="room-card ${avail ? '' : 'full'}" onclick="openRoomDetails('${r.id}')">
          <div class="room-card-header">
            <span class="room-card-number">🚪 ${escapeHtml(r.roomCode)}</span>
            <span class="room-card-hostel">${escapeHtml(r.hostel)}</span>
          </div>
          <div class="room-card-body">
            <div class="room-card-detail">
              <span><i class="fas fa-building"></i> Floor</span>
              <span class="value">${escapeHtml(r.floorLabel)}</span>
            </div>
            <div class="room-card-detail">
              <span><i class="fas fa-rupee-sign"></i> Base Rent</span>
              <span class="value">PKR ${r.baseRent.toLocaleString()}</span>
            </div>
            <div class="room-card-progress">
              <div class="room-card-progress-header">
                <span>${r.currentOccupancy} / ${r.maxCapacity} Occupied</span>
                <span class="room-card-status ${avail ? 'available' : 'full'}">
                  <span class="status-dot ${st.dot}" style="width:8px;height:8px;"></span>
                  ${avail ? 'Available' : 'Full'}
                </span>
              </div>
              <div class="progress-track">
                <div class="progress-fill ${occClass}" style="width:${pct}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  function filterRooms() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const hostel = document.getElementById('hostelFilter').value;
    const avail = document.getElementById('availabilityFilter').value;
  
    let res = [...appState.allRooms];
    
    if (search) {
      res = res.filter(r => r.roomCode.toLowerCase().includes(search));
    }
    if (hostel !== 'all') {
      res = res.filter(r => r.hostel === hostel);
    }
    if (avail === 'available') {
      res = res.filter(r => r.currentOccupancy >= 1 && r.currentOccupancy < r.maxCapacity);
    }
    if (avail === 'empty') {
      res = res.filter(r => r.currentOccupancy === 0);
    }
  
    appState.filteredRooms = res;
    renderRooms(res);
  }
  
  function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('hostelFilter').value = 'all';
    document.getElementById('availabilityFilter').value = 'all';
    appState.filteredRooms = [...appState.allRooms];
    renderRooms(appState.filteredRooms);
  }
  
  // ═══════════════════════════════════════════
  // MODAL & INTERACTIONS
  // ═══════════════════════════════════════════
  
  function openRoomDetails(id) {
    const r = appState.allRooms.find(x => x.id === id);
    if (!r) return;
    
    appState.selectedRoom = r;
  
    document.getElementById('modalTitle').textContent = `Room ${r.roomCode}`;
    document.getElementById('modalSubtitle').textContent = `${r.hostel} • ${r.floorLabel} Floor`;
  
    const occClass = getOccupancyClass(r.currentOccupancy, r.maxCapacity);
    const pct = (r.currentOccupancy / r.maxCapacity) * 100;
    const st = getOccupancyStatus(r.currentOccupancy, r.maxCapacity);
  
    // Generate semester rent rows
    let rentHTML = '';
    for (let s = 1; s <= 8; s++) {
      const rent = getSemesterRent(r.baseRent, s);
      rentHTML += `
        <div class="semester-row ${s === 7 ? 'current' : ''}">
          <span class="semester">Semester ${s}${s === 7 ? ' (Current)' : ''}</span>
          <span class="rent">PKR ${rent.toLocaleString()}</span>
        </div>
      `;
    }
  
    document.getElementById('modalBody').innerHTML = `
      <div style="margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="color:var(--gray-600);">Occupancy</strong>
          <span class="room-card-status ${r.currentOccupancy < r.maxCapacity ? 'available' : 'full'}">
            <span class="status-dot ${st.dot}" style="width:8px;height:8px;"></span>
            ${st.text}
          </span>
        </div>
        <div class="progress-track" style="height:8px;">
          <div class="progress-fill ${occClass}" style="width:${pct}%"></div>
        </div>
        <p style="font-size:13px;color:var(--gray-500);margin-top:6px;">
          ${r.currentOccupancy} of ${r.maxCapacity} beds taken
        </p>
      </div>
      
      <div style="margin-bottom:20px;">
        <strong style="color:var(--gray-600);display:block;margin-bottom:10px;">Room Details</strong>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="background:var(--gray-50);padding:12px;border-radius:10px;">
            <small style="color:var(--gray-500);">Hostel</small><br>
            <strong>${escapeHtml(r.hostel)}</strong>
          </div>
          <div style="background:var(--gray-50);padding:12px;border-radius:10px;">
            <small style="color:var(--gray-500);">Floor</small><br>
            <strong>${escapeHtml(r.floorLabel)}</strong>
          </div>
          <div style="background:var(--gray-50);padding:12px;border-radius:10px;">
            <small style="color:var(--gray-500);">Room #</small><br>
            <strong>${r.roomNumber}</strong>
          </div>
          <div style="background:var(--gray-50);padding:12px;border-radius:10px;">
            <small style="color:var(--gray-500);">Base Rent</small><br>
            <strong>PKR ${r.baseRent.toLocaleString()}</strong>
          </div>
        </div>
      </div>
      
      <div class="rent-toggle" onclick="toggleRentDetails()">
        <div class="rent-toggle-header">
          <i class="fas fa-chevron-down"></i>
          <span>Semester-wise Rent Details</span>
        </div>
        <small style="color:var(--gray-500);">Click to view</small>
      </div>
      <div class="semester-rent" id="semesterRent">${rentHTML}</div>
      
      <div style="margin-top:20px;background:${r.currentOccupancy < r.maxCapacity ? 'var(--success-light)' : 'var(--gray-100)'};padding:16px;border-radius:12px;border-left:4px solid ${r.currentOccupancy < r.maxCapacity ? 'var(--success)' : 'var(--gray-400)'};">
        <strong style="color:${r.currentOccupancy < r.maxCapacity ? 'var(--success)' : 'var(--gray-600)'};display:flex;align-items:center;gap:8px;">
          <i class="fas ${r.currentOccupancy < r.maxCapacity ? 'fa-circle-check' : 'fa-circle-info'}"></i>
          ${r.currentOccupancy < r.maxCapacity ? 'Room has available space' : 'Room is currently full'}
        </strong>
        <p style="font-size:13px;color:var(--gray-600);margin-top:6px;">
          ${r.currentOccupancy < r.maxCapacity 
            ? `${r.maxCapacity - r.currentOccupancy} spot${r.maxCapacity - r.currentOccupancy > 1 ? 's' : ''} available` 
            : 'No spots available'}
        </p>
      </div>
    `;
  
    document.getElementById('roomModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function toggleRentDetails() {
    const toggle = document.querySelector('.rent-toggle');
    const content = document.getElementById('semesterRent');
    if (toggle && content) {
      toggle.classList.toggle('active');
      content.classList.toggle('show');
    }
  }
  
  function closeModal() {
    document.getElementById('roomModal').classList.remove('active');
    document.body.style.overflow = '';
    appState.selectedRoom = null;
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // ═══════════════════════════════════════════
  // INITIALIZATION & EVENT LISTENERS
  // ═══════════════════════════════════════════
  
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize localStorage with default data
    initLocalStorage();
    
    // Load data into app state
    loadData();
    
    // Render my room section
    renderMyRoom();
    
    // Render rooms grid
    renderRooms(appState.filteredRooms);
  
    // Close profile dropdown when clicking outside
    document.addEventListener('click', e => {
      const dropdown = document.getElementById('profileDropdown');
      const profileSection = document.querySelector('.header-profile-section');
      if (dropdown && profileSection && !profileSection.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  
    // Modal close handlers
    const modal = document.getElementById('roomModal');
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target.id === 'roomModal') closeModal();
      });
    }
  
    // Close modal on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  
    
  });