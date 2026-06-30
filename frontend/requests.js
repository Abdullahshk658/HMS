// requests.js - Complete JavaScript with localStorage Backend for SmartDormX Admin

// ========== STORAGE CONFIGURATION ==========
const STORAGE = {
    KEYS: {
        PENDING: 'smartdormx_requests_pending',
        PROCESSED: 'smartdormx_requests_processed',
        INITIALIZED: 'smartdormx_data_initialized'
    },
    VERSION: '1.0'
};

// ========== GLOBAL STATE ==========
let requests = [];
let processedRequests = [];
let currentRequest = null;
let currentAction = null;
let activeTab = 'pending';

// ========== SAMPLE DATA (Used on first load only) ==========
const SAMPLE_PENDING = [
    {
        id: 'req_' + Date.now() + '_001',
        student: "Ahmed Hassan",
        rollNo: "B22F0403CS046",
        hostel: "Hostel A",
        room: "A-204",
        submitted: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        type: "complaint",
        severity: "high",
        subject: "Request for Room Change",
        message: "Dear Admin,\n\nI am writing to request a room change due to persistent water leakage issues in my current room. The ceiling has been leaking for the past week and it is affecting my studies and health.\n\nI would appreciate if you could assign me a room in Block B or C.\n\nThank you,\nAhmed Hassan"
    },
    {
        id: 'req_' + Date.now() + '_002',
        student: "Fatima Khan",
        rollNo: "B22F0401CS023",
        hostel: "Hostel B",
        room: "B-105",
        submitted: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        type: "application",
        severity: "medium",
        subject: "Mess Menu Change Request",
        message: "Dear Admin,\n\nI would like to request a change in the mess menu. Could we please have more vegetarian options on Fridays?\n\nThank you,\nFatima Khan"
    },
    {
        id: 'req_' + Date.now() + '_003',
        student: "Mohammad Ali",
        rollNo: "B22F0402CS089",
        hostel: "Hostel A",
        room: "A-312",
        submitted: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        type: "complaint",
        severity: "low",
        subject: "WiFi Connectivity Issue",
        message: "Dear Admin,\n\nThe WiFi in room A-312 has been very slow for the past few days. Please look into this.\n\nRegards,\nMohammad Ali"
    }
];

const SAMPLE_PROCESSED = [
    {
        id: 'req_' + (Date.now() - 300000) + '_004',
        student: "Sara Ahmed",
        rollNo: "B22F0403CS012",
        hostel: "Hostel C",
        room: "C-201",
        submitted: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "resolved",
        type: "complaint",
        severity: "high",
        subject: "AC Not Working",
        message: "The AC in my room is not cooling properly.",
        resolvedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedBy: "Nabeel Ashraf",
        resolutionNote: "AC repaired and serviced on March 15th."
    },
    {
        id: 'req_' + (Date.now() - 200000) + '_005',
        student: "Hassan Raza",
        rollNo: "B22F0401CS067",
        hostel: "Hostel B",
        room: "B-408",
        submitted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: "rejected",
        type: "application",
        severity: "medium",
        subject: "Room Change Request",
        message: "Want to change room to ground floor.",
        resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedBy: "Nabeel Ashraf",
        resolutionNote: "No ground floor rooms available at the moment. Please check back next semester."
    },
    {
        id: 'req_' + (Date.now() - 100000) + '_006',
        student: "Ayesha Malik",
        rollNo: "B22F0402CS034",
        hostel: "Hostel A",
        room: "A-115",
        submitted: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: "resolved",
        type: "complaint",
        severity: "low",
        subject: "Fan Noise Issue",
        message: "The ceiling fan in my room is making unusual noise.",
        resolvedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedBy: "Nabeel Ashraf",
        resolutionNote: "Fan bearings replaced. Issue resolved."
    }
];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    initStorage();
    renderRequests();
    renderProcessedRequests();
    updateStats();
    setupEventListeners();
});

// ========== LOCAL STORAGE BACKEND ==========
function initStorage() {
    try {
        // Check if data already exists
        const hasPending = localStorage.getItem(STORAGE.KEYS.PENDING);
        const hasProcessed = localStorage.getItem(STORAGE.KEYS.PROCESSED);
        const isInitialized = localStorage.getItem(STORAGE.KEYS.INITIALIZED);
        
        if (isInitialized === STORAGE.VERSION && hasPending && hasProcessed) {
            // Load existing data
            requests = JSON.parse(hasPending);
            processedRequests = JSON.parse(hasProcessed);
        } else {
            // First time: load sample data and save to localStorage
            requests = JSON.parse(JSON.stringify(SAMPLE_PENDING));
            processedRequests = JSON.parse(JSON.stringify(SAMPLE_PROCESSED));
            saveAll();
            localStorage.setItem(STORAGE.KEYS.INITIALIZED, STORAGE.VERSION);
        }
    } catch (error) {
        console.error('Storage initialization error:', error);
        // Fallback to sample data if storage fails
        requests = JSON.parse(JSON.stringify(SAMPLE_PENDING));
        processedRequests = JSON.parse(JSON.stringify(SAMPLE_PROCESSED));
    }
}

function savePending() {
    try {
        localStorage.setItem(STORAGE.KEYS.PENDING, JSON.stringify(requests));
    } catch (e) {
        console.error('Failed to save pending requests:', e);
        showToast('error', 'Save Error', 'Could not save changes to storage.');
    }
}

function saveProcessed() {
    try {
        localStorage.setItem(STORAGE.KEYS.PROCESSED, JSON.stringify(processedRequests));
    } catch (e) {
        console.error('Failed to save processed requests:', e);
        showToast('error', 'Save Error', 'Could not save changes to storage.');
    }
}

function saveAll() {
    savePending();
    saveProcessed();
}

function clearStorage() {
    localStorage.removeItem(STORAGE.KEYS.PENDING);
    localStorage.removeItem(STORAGE.KEYS.PROCESSED);
    localStorage.removeItem(STORAGE.KEYS.INITIALIZED);
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const onclick = this.getAttribute('onclick');
            if (onclick) {
                const match = onclick.match(/'(\w+)'/);
                if (match && match[1]) switchTab(match[1], this);
            }
        });
    });

    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal('detailModal');
            closeModal('confirmModal');
        }
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// ========== TAB SWITCHING ==========
function switchTab(tab, btnElement) {
    activeTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    // Update sections
    document.querySelectorAll('.tab-section').forEach(section => section.classList.remove('active'));
    
    if (tab === 'pending') {
        document.getElementById('pendingSection').classList.add('active');
        renderRequests();
        updateStats();
    } else {
        document.getElementById('processedSection').classList.add('active');
        renderProcessedRequests();
    }
}

// ========== RENDER PENDING REQUESTS ==========
function renderRequests() {
    const listContainer = document.getElementById('requestsList');
    const emptyState = document.getElementById('emptyState');
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const severityFilter = document.getElementById('severityFilter')?.value || '';
    
    let filtered = requests.filter(req => {
        const matchSearch = req.student.toLowerCase().includes(searchTerm) || 
                           req.rollNo.toLowerCase().includes(searchTerm) ||
                           req.subject.toLowerCase().includes(searchTerm);
        const matchType = !typeFilter || req.type === typeFilter;
        const matchSeverity = !severityFilter || req.severity === severityFilter;
        return matchSearch && matchType && matchSeverity;
    });
    
    if (filtered.length === 0) {
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    listContainer.style.display = 'flex';
    emptyState.style.display = 'none';
    
    listContainer.innerHTML = filtered.map(req => `
        <div class="request-card ${req.severity}" onclick="openDetailModal('${req.id}')">
            <div class="request-left">
                <h3 class="request-title">${escapeHtml(req.subject)}</h3>
                <span class="severity-badge ${req.severity}">${req.severity}</span>
            </div>
            <div class="request-center">
                <div class="meta-item"><i class="fas fa-user"></i><span>${escapeHtml(req.student)}</span></div>
                <div class="meta-item"><i class="fas fa-id-card"></i><span>${escapeHtml(req.rollNo)}</span></div>
                <div class="meta-item"><i class="fas fa-clock"></i><span>${formatRelativeDate(req.submitted)}</span></div>
            </div>
            <div class="request-right">
                <div class="request-location"><i class="fas fa-location-dot"></i><span>${escapeHtml(req.hostel)} - ${escapeHtml(req.room)}</span></div>
                <div class="action-icons">
                    <button class="icon-btn resolve" onclick="event.stopPropagation(); quickAction('${req.id}', 'resolved')" title="Resolve"><i class="fas fa-check"></i></button>
                    <button class="icon-btn reject" onclick="event.stopPropagation(); quickAction('${req.id}', 'rejected')" title="Reject"><i class="fas fa-times"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== RENDER PROCESSED REQUESTS ==========
function renderProcessedRequests() {
    const listContainer = document.getElementById('processedList');
    const emptyState = document.getElementById('processedEmptyState');
    const searchTerm = (document.getElementById('processedSearchInput')?.value || '').toLowerCase();
    const resolutionFilter = document.getElementById('resolutionFilter')?.value || '';
    const monthFilter = document.getElementById('monthFilter')?.value || '';
    
    let filtered = processedRequests.filter(req => {
        const matchSearch = req.student.toLowerCase().includes(searchTerm) || 
                           req.rollNo.toLowerCase().includes(searchTerm) ||
                           req.subject.toLowerCase().includes(searchTerm);
        const matchStatus = !resolutionFilter || req.status === resolutionFilter;
        const matchMonth = !monthFilter || isDateInMonth(req.resolvedAt, monthFilter);
        return matchSearch && matchStatus && matchMonth;
    });
    
    if (filtered.length === 0) {
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    listContainer.style.display = 'flex';
    emptyState.style.display = 'none';
    
    listContainer.innerHTML = filtered.map(req => `
        <div class="request-card ${req.severity}" onclick="openProcessedDetailModal('${req.id}')">
            <div class="request-left">
                <h3 class="request-title">${escapeHtml(req.subject)}</h3>
                <span class="severity-badge ${req.severity}">${req.severity}</span>
            </div>
            <div class="request-center">
                <div class="meta-item"><i class="fas fa-user"></i><span>${escapeHtml(req.student)}</span></div>
                <div class="meta-item"><i class="fas fa-id-card"></i><span>${escapeHtml(req.rollNo)}</span></div>
                <div class="meta-item">
                    <i class="fas fa-check-circle" style="color: ${req.status === 'resolved' ? 'var(--success)' : 'var(--danger)'}"></i>
                    <span style="color: ${req.status === 'resolved' ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">
                        ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                </div>
            </div>
            <div class="request-right">
                <div class="request-location"><i class="fas fa-location-dot"></i><span>${escapeHtml(req.hostel)} - ${escapeHtml(req.room)}</span></div>
                <div class="action-icons">
                    <button class="icon-btn" style="background: var(--info);" onclick="event.stopPropagation(); viewProcessedDetails('${req.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== UTILITY FUNCTIONS ==========
function isDateInMonth(dateStr, monthValue) {
    if (!dateStr || !monthValue) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const dateMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return dateMonth === monthValue;
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return 'N/A';
    if (typeof dateStr === 'string' && /\d+[hdw]/.test(dateStr)) return dateStr;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateId(prefix = 'req') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ========== MODAL FUNCTIONS ==========
function openDetailModal(id) {
    currentRequest = requests.find(r => r.id === id);
    if (!currentRequest) return;
    
    document.getElementById('actionFooter').style.display = 'flex';
    document.getElementById('detailModalBody').innerHTML = `
        <div class="detail-grid" style="margin-bottom: 1.5rem;">
            <div class="detail-item"><span class="detail-item-label">STUDENT</span><span class="detail-item-value">${escapeHtml(currentRequest.student)}</span></div>
            <div class="detail-item"><span class="detail-item-label">ROLL NO</span><span class="detail-item-value">${escapeHtml(currentRequest.rollNo)}</span></div>
            <div class="detail-item"><span class="detail-item-label">HOSTEL</span><span class="detail-item-value">${escapeHtml(currentRequest.hostel)}</span></div>
            <div class="detail-item"><span class="detail-item-label">ROOM</span><span class="detail-item-value">${escapeHtml(currentRequest.room)}</span></div>
            <div class="detail-item"><span class="detail-item-label">SUBMITTED</span><span class="detail-item-value">${formatRelativeDate(currentRequest.submitted)}</span></div>
            <div class="detail-item"><span class="detail-item-label">STATUS</span><span class="status-badge pending"><i class="fas fa-clock"></i> Pending</span></div>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <div class="detail-label" style="margin-bottom: 0.75rem;">Subject</div>
            <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius); border-left: 4px solid var(--primary);">
                <div style="font-weight: 600; color: var(--gray-900);">${escapeHtml(currentRequest.subject)}</div>
            </div>
        </div>
        <div>
            <div class="detail-label" style="margin-bottom: 0.75rem;">Full Message</div>
            <div class="message-box"><div class="message-content">${escapeHtml(currentRequest.message)}</div></div>
        </div>
    `;
    document.getElementById('detailModal').classList.add('active');
}

function openProcessedDetailModal(id) {
    currentRequest = processedRequests.find(r => r.id === id);
    if (!currentRequest) return;
    
    document.getElementById('actionFooter').style.display = 'none';
    const icon = currentRequest.status === 'resolved' ? 'fa-check-circle' : 'fa-times-circle';
    const color = currentRequest.status === 'resolved' ? 'var(--success)' : 'var(--danger)';
    
    document.getElementById('detailModalBody').innerHTML = `
        <div class="detail-grid" style="margin-bottom: 1.5rem;">
            <div class="detail-item"><span class="detail-item-label">STUDENT</span><span class="detail-item-value">${escapeHtml(currentRequest.student)}</span></div>
            <div class="detail-item"><span class="detail-item-label">ROLL NO</span><span class="detail-item-value">${escapeHtml(currentRequest.rollNo)}</span></div>
            <div class="detail-item"><span class="detail-item-label">HOSTEL</span><span class="detail-item-value">${escapeHtml(currentRequest.hostel)}</span></div>
            <div class="detail-item"><span class="detail-item-label">ROOM</span><span class="detail-item-value">${escapeHtml(currentRequest.room)}</span></div>
            <div class="detail-item"><span class="detail-item-label">SUBMITTED</span><span class="detail-item-value">${formatRelativeDate(currentRequest.submitted)}</span></div>
            <div class="detail-item"><span class="detail-item-label">STATUS</span><span class="status-badge ${currentRequest.status}"><i class="fas ${icon}"></i> ${currentRequest.status.charAt(0).toUpperCase() + currentRequest.status.slice(1)}</span></div>
            <div class="detail-item"><span class="detail-item-label">RESOLVED BY</span><span class="detail-item-value">${escapeHtml(currentRequest.resolvedBy || 'Admin')}</span></div>
            <div class="detail-item"><span class="detail-item-label">RESOLVED AT</span><span class="detail-item-value">${formatRelativeDate(currentRequest.resolvedAt)}</span></div>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <div class="detail-label" style="margin-bottom: 0.75rem;">Subject</div>
            <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius); border-left: 4px solid var(--primary);">
                <div style="font-weight: 600; color: var(--gray-900);">${escapeHtml(currentRequest.subject)}</div>
            </div>
        </div>
        <div style="margin-bottom: 1.5rem;">
            <div class="detail-label" style="margin-bottom: 0.75rem;">Full Message</div>
            <div class="message-box"><div class="message-content">${escapeHtml(currentRequest.message)}</div></div>
        </div>
        <div>
            <div class="detail-label" style="margin-bottom: 0.75rem;">Resolution Note</div>
            <div class="message-box" style="border-left-color: ${color};"><div class="message-content">${escapeHtml(currentRequest.resolutionNote)}</div></div>
        </div>
    `;
    document.getElementById('detailModal').classList.add('active');
}

function viewProcessedDetails(id) { openProcessedDetailModal(id); }

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    
    if (modalId === 'confirmModal') {
        const note = document.getElementById('resolutionNote');
        const error = document.getElementById('noteError');
        if (note) note.value = '';
        if (error) error.style.display = 'none';
        currentAction = null;
    }
}

function quickAction(id, action) {
    openDetailModal(id);
    setTimeout(() => showConfirmModal(action), 300);
}

function showConfirmModal(action) {
    currentAction = action;
    const title = document.getElementById('confirmTitle');
    const msg = document.getElementById('confirmMessage');
    
    if (action === 'resolved') {
        title.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success); margin-right: 0.5rem;"></i> Mark as Resolved';
        msg.textContent = 'Are you sure you want to mark this request as resolved?';
    } else {
        title.innerHTML = '<i class="fas fa-times-circle" style="color: var(--danger); margin-right: 0.5rem;"></i> Reject Request';
        msg.textContent = 'Are you sure you want to reject this request?';
    }
    document.getElementById('confirmModal').classList.add('active');
}

// ========== EXECUTE ACTION (RESOLVE/REJECT) ==========
function executeAction() {
    // currentRequest is set by openDetailModal / quickAction
    if (!currentRequest) {
        showToast('error', 'Error', 'No request selected. Please open a request first.');
        closeModal('confirmModal');
        return;
    }

    const noteEl  = document.getElementById('resolutionNote');
    const errorEl = document.getElementById('noteError');
    const resolutionNote = noteEl ? noteEl.value.trim() : '';

    // Require a resolution note before processing
    if (!resolutionNote) {
        if (errorEl) errorEl.style.display = 'block';
        if (noteEl)  noteEl.focus();
        return;
    }
    if (errorEl) errorEl.style.display = 'none';

    // Find the request in the pending array
    const idx = requests.findIndex(r => r.id === currentRequest.id);
    if (idx === -1) {
        showToast('error', 'Error', 'Request not found in pending list.');
        closeModal('confirmModal');
        return;
    }

    // Build the processed record
    const processed = {
        ...requests[idx],
        status:         currentAction,          // 'resolved' or 'rejected'
        resolvedAt:     new Date().toISOString(),
        resolvedBy:     'Nabeel Ashraf',
        resolutionNote: resolutionNote
    };

    // Remove from pending, add to front of processed
    requests.splice(idx, 1);
    processedRequests.unshift(processed);

    // Persist both arrays to localStorage
    saveAll();

    // Close both modals
    closeModal('confirmModal');
    closeModal('detailModal');

    // Refresh the UI
    renderRequests();
    renderProcessedRequests();
    updateStats();

    // Notify the admin
    const actionText = currentAction === 'resolved' ? 'Resolved' : 'Rejected';
    showToast('success', actionText + '!',
        `"${processed.subject}" has been ${currentAction}.`);

    // Reset global state
    currentRequest = null;
    currentAction  = null;
}


// (Supabase renderRequestsList removed — uses renderRequests/renderProcessedRequests)

// ========== TOAST NOTIFICATIONS ==========
function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle' };
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type] || 'fa-info-circle'}"></i></div>
        <div class="toast-content"><div class="toast-title">${escapeHtml(title)}</div><div class="toast-message">${escapeHtml(message)}</div></div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ========== STATS ==========
function updateStats() {
    const c = requests.filter(r => r.type === 'complaint').length;
    const a = requests.filter(r => r.type === 'application').length;
    const h = requests.filter(r => r.severity === 'high').length;
    const m = requests.filter(r => r.severity === 'medium').length;
    const l = requests.filter(r => r.severity === 'low').length;
    
    animateValue('totalComplaints', parseInt(document.getElementById('totalComplaints')?.textContent) || 0, c, 500);
    animateValue('totalApplications', parseInt(document.getElementById('totalApplications')?.textContent) || 0, a, 500);
    animateValue('highCount', parseInt(document.getElementById('highCount')?.textContent) || 0, h, 500);
    animateValue('mediumCount', parseInt(document.getElementById('mediumCount')?.textContent) || 0, m, 500);
    animateValue('lowCount', parseInt(document.getElementById('lowCount')?.textContent) || 0, l, 500);
    
    const pendingBadge = document.getElementById('pendingBadge');
    const processedBadge = document.getElementById('processedBadge');
    if (pendingBadge) pendingBadge.textContent = requests.length;
    if (processedBadge) processedBadge.textContent = processedRequests.length;
}

function animateValue(id, start, end, duration) {
    const el = document.getElementById(id);
    if (!el || start === end) return;
    
    const range = end - start;
    const step = end > start ? 1 : -1;
    const time = Math.max(Math.floor(duration / Math.abs(range)), 30);
    let cur = start;
    
    const timer = setInterval(() => {
        cur += step;
        el.textContent = cur;
        if (cur === end) clearInterval(timer);
    }, time);
}

// ========== FILTERS ==========
function filterRequests() { renderRequests(); }
function resetFilters() {
    const search = document.getElementById('searchInput');
    const type = document.getElementById('typeFilter');
    const severity = document.getElementById('severityFilter');
    if (search) search.value = '';
    if (type) type.value = '';
    if (severity) severity.value = '';
    renderRequests();
}
function filterProcessed() { renderProcessedRequests(); }
function resetProcessedFilters() {
    const search = document.getElementById('processedSearchInput');
    const resolution = document.getElementById('resolutionFilter');
    const month = document.getElementById('monthFilter');
    if (search) search.value = '';
    if (resolution) resolution.value = '';
    if (month) month.value = '';
    renderProcessedRequests();
}

// ========== EXPORT TO EXCEL ==========
function exportToExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('warning', 'Library Missing', 'Excel library not loaded. Please refresh the page.');
    return;
  }

  const toExport = processedRequests;
  if (!toExport || toExport.length === 0) {
    showToast('warning', 'Nothing to Export', 'No processed requests to export.');
    return;
  }

  try {
    const exportData = toExport.map(req => ({
      'Request ID':      req.id,
      'Type':            req.type === 'complaint' ? 'Complaint' : 'Application',
      'Subject':         req.subject,
      'Message':         req.message,
      'Student':         req.student,
      'Roll No':         req.rollNo,
      'Hostel':          req.hostel,
      'Room':            req.room,
      'Severity':        req.severity,
      'Status':          req.status.charAt(0).toUpperCase() + req.status.slice(1),
      'Submitted':       req.submitted ? new Date(req.submitted).toLocaleString() : '',
      'Resolved At':     req.resolvedAt ? new Date(req.resolvedAt).toLocaleString() : '',
      'Resolved By':     req.resolvedBy || 'Admin',
      'Resolution Note': req.resolutionNote || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    const colWidths = [20, 12, 30, 50, 20, 18, 12, 10, 10, 12, 22, 22, 18, 40];
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Processed Requests');

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SmartDormX_Requests_${date}.xlsx`);
    showToast('success', 'Exported!', 'Requests exported to Excel successfully.');
  } catch (error) {
    console.error('Export error:', error);
    showToast('error', 'Export Failed', 'An error occurred: ' + error.message);
  }
}

// ========== TEST & CLEAR FUNCTIONS ==========
function addTestRequest() {
    const req = {
        id: generateId(),
        student: "Test Student",
        rollNo: "TST" + Date.now(),
        hostel: "Hostel A",
        room: "A-999",
        submitted: new Date().toISOString(),
        status: "pending",
        type: "complaint",
        severity: "medium",
        subject: "Test Request",
        message: "Automated test request for localStorage validation."
    };
    
    requests.unshift(req);
    savePending(); // 🔥 PERSIST
    renderRequests();
    updateStats();
    showToast('success', 'Request Added', 'Test request saved to localStorage.');
}

function clearAllData() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL requests from localStorage. Continue?')) return;
    
    requests = [];
    processedRequests = [];
    clearStorage(); // 🔥 WIPE LOCALSTORAGE
    
    renderRequests();
    renderProcessedRequests();
    updateStats();
    showToast('success', 'Data Cleared', 'All localStorage data has been wiped. Page will reload with fresh sample data.');
    
    // Reload with fresh data after short delay
    setTimeout(() => {
        localStorage.removeItem(STORAGE.KEYS.INITIALIZED);
        location.reload();
    }, 1500);
}

function printRequest(id) {
    const req = requests.find(r => r.id === id) || processedRequests.find(r => r.id === id);
    if (!req) return;
    
    const w = window.open('', '_blank');
    if (!w) {
        showToast('error', 'Popup Blocked', 'Please allow popups to print.');
        return;
    }
    
    w.document.write(`<!DOCTYPE html><html><head><title>Print - ${escapeHtml(req.subject)}</title>
    <style>
        body{font-family:system-ui,-apple-system,sans-serif;padding:2rem;max-width:800px;margin:0 auto;line-height:1.6}
        h1{border-bottom:3px solid #6366f1;padding-bottom:0.75rem;color:#111827}
        .row{margin:0.6rem 0;display:flex;gap:0.5rem}
        .label{font-weight:600;color:#6b7280;min-width:130px}
        .value{color:#111827}
        .box{background:#f9fafb;padding:1.25rem;border-left:4px solid #6366f1;margin:1.25rem 0;white-space:pre-wrap;border-radius:0 0.375rem 0.375rem 0}
        .status{display:inline-block;padding:0.25rem 0.75rem;border-radius:999px;font-weight:600;font-size:0.875rem}
        .status.resolved{background:#f0fdf4;color:#16a34a}
        .status.rejected{background:#fef2f2;color:#dc2626}
        .status.pending{background:#fffbeb;color:#d97706}
        @media print{body{padding:1rem}.no-print{display:none}}
    </style></head><body>
    <h1>${escapeHtml(req.subject)}</h1>
    <div class="row"><span class="label">Student:</span><span class="value">${escapeHtml(req.student)}</span></div>
    <div class="row"><span class="label">Roll No:</span><span class="value">${escapeHtml(req.rollNo)}</span></div>
    <div class="row"><span class="label">Hostel/Room:</span><span class="value">${escapeHtml(req.hostel)} - ${escapeHtml(req.room)}</span></div>
    <div class="row"><span class="label">Status:</span><span class="value"><span class="status ${req.status}">${req.status.charAt(0).toUpperCase()+req.status.slice(1)}</span></span></div>
    <div class="row"><span class="label">Submitted:</span><span class="value">${formatRelativeDate(req.submitted)}</span></div>
    ${req.resolvedAt ? `<div class="row"><span class="label">Resolved:</span><span class="value">${formatRelativeDate(req.resolvedAt)} by ${escapeHtml(req.resolvedBy||'Admin')}</span></div>`:''}
    <h3 style="margin-top:1.5rem">Message</h3><div class="box">${escapeHtml(req.message)}</div>
    ${req.resolutionNote ? `<h3>Resolution Note</h3><div class="box" style="border-left-color:${req.status==='resolved'?'#16a34a':'#dc2626'}">${escapeHtml(req.resolutionNote)}</div>`:''}
    <div class="no-print" style="margin-top:2rem;text-align:center">
        <button onclick="window.print()" style="padding:0.75rem 1.5rem;background:#6366f1;color:white;border:none;border-radius:0.375rem;cursor:pointer;font-weight:500">🖨️ Print</button>
        <button onclick="window.close()" style="padding:0.75rem 1.5rem;background:#6b7280;color:white;border:none;border-radius:0.375rem;cursor:pointer;font-weight:500;margin-left:0.5rem">Close</button>
    </div>
    <script>window.onload=function(){if(location.href.includes('print=1'))window.print()}<\/script>
    </body></html>`);
    w.document.close();
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const search = document.getElementById('searchInput');
        if (search) {
            search.focus();
            search.select();
        }
    }
    // Ctrl/Cmd + R: Refresh data (not page)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (activeTab === 'pending') {
            renderRequests();
            updateStats();
        } else {
            renderProcessedRequests();
        }
        showToast('success', 'Refreshed', 'Data reloaded from localStorage.');
    }
});

// ========== GLOBAL EXPORTS FOR HTML onclick ==========
window.switchTab = switchTab;
window.openDetailModal = openDetailModal;
window.openProcessedDetailModal = openProcessedDetailModal;
window.viewProcessedDetails = viewProcessedDetails;
window.closeModal = closeModal;
window.quickAction = quickAction;
window.showConfirmModal = showConfirmModal;
window.executeAction = executeAction;
window.filterRequests = filterRequests;
window.resetFilters = resetFilters;
window.filterProcessed = filterProcessed;
window.resetProcessedFilters = resetProcessedFilters;
window.exportToExcel = exportToExcel;
window.showToast = showToast;
window.addTestRequest = addTestRequest;
window.clearAllData = clearAllData;
window.printRequest = printRequest;

// ========== DEBUG UTILS (Remove in production) ==========
// Access via console: debugStorage()
window.debugStorage = function() {
    console.group('🗄️ SmartDormX Storage Debug');
    console.log('Version:', localStorage.getItem(STORAGE.KEYS.INITIALIZED));
    console.log('Pending count:', JSON.parse(localStorage.getItem(STORAGE.KEYS.PENDING) || '[]').length);
    console.log('Processed count:', JSON.parse(localStorage.getItem(STORAGE.KEYS.PROCESSED) || '[]').length);
    console.log('Pending sample:', JSON.parse(localStorage.getItem(STORAGE.KEYS.PENDING) || '[]')[0]);
    console.groupEnd();
};