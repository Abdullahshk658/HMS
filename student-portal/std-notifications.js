// State
let notifications = [];
let announcements = [];
let trash = [];
let expandedItems = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateStats();
});

// Load Data with 5 notifications + 5 announcements
function loadData() {
    notifications = [
        { id: 'n1', title: 'Fee Payment Due', message: 'Your semester fee of Rs 25,000 is due on April 25, 2026. Please pay on time.', type: 'payment', severity: 'urgent', createdAt: new Date(Date.now() - 2*60*60*1000).toISOString() },
        { id: 'n2', title: 'Room Maintenance', message: 'Maintenance scheduled for your room tomorrow 10AM-12PM. Please secure valuables.', type: 'hostel', severity: 'important', createdAt: new Date(Date.now() - 5*60*60*1000).toISOString() },
        { id: 'n3', title: 'Library Reminder', message: 'You have 2 books due for return by April 22. Renew online or return to avoid fines.', type: 'academic', severity: 'normal', createdAt: new Date(Date.now() - 12*60*60*1000).toISOString() },
        { id: 'n4', title: 'Complaint Resolved', message: 'Your complaint #CMP-2026-045 about water supply has been resolved. Please verify.', type: 'complaint', severity: 'normal', createdAt: new Date(Date.now() - 1*24*60*60*1000).toISOString() },
        { id: 'n5', title: 'Wi-Fi Upgrade', message: 'Hostel Wi-Fi will be upgraded tonight 2AM-4AM. Expect brief disconnections.', type: 'general', severity: 'important', createdAt: new Date(Date.now() - 2*24*60*60*1000).toISOString() }
    ];
    
    announcements = [
        { id: 'a1', title: 'Mid-Term Schedule', message: 'Mid-term examination schedule published. Download your timetable from the portal. Exams begin May 5.', type: 'exam', severity: 'urgent', createdAt: new Date(Date.now() - 3*60*60*1000).toISOString() },
        { id: 'a2', title: 'Sports Day Registration', message: 'Registration for Annual Sports Day 2026 is open! Cricket, football, athletics. Register by April 30.', type: 'event', severity: 'important', createdAt: new Date(Date.now() - 8*60*60*1000).toISOString() },
        { id: 'a3', title: 'Eid Holiday', message: 'University closed for Eid-ul-Fitr April 10-12. Offices resume April 13. Special mess meals available.', type: 'holiday', severity: 'normal', createdAt: new Date(Date.now() - 1*24*60*60*1000).toISOString() },
        { id: 'a4', title: 'New Cafeteria Menu', message: 'Starting April 20, new healthy menu with vegetarian, vegan, gluten-free options. Preview in app.', type: 'general', severity: 'normal', createdAt: new Date(Date.now() - 3*24*60*60*1000).toISOString() },
        { id: 'a5', title: 'Security Alert', message: 'Report suspicious activity to campus security. Emergency: +92-XXX-XXXXXXX. Patrols increased.', type: 'general', severity: 'urgent', createdAt: new Date(Date.now() - 4*24*60*60*1000).toISOString() }
    ];
    
    const saved = localStorage.getItem('notifTrash');
    trash = saved ? JSON.parse(saved) : [];
    
    renderNotifications();
    renderAnnouncements();
    renderTrash();
    updateStats();
}

// Save Trash
function saveTrash() {
    localStorage.setItem('notifTrash', JSON.stringify(trash));
}

// Delete Item (Move to Trash)
function deleteItem(id, type) {
    const items = type === 'notification' ? notifications : announcements;
    const item = items.find(n => n.id === id);
    if (!item) return;
    
    trash.push({ ...item, deletedAt: new Date().toISOString(), originalType: type });
    saveTrash();
    
    if (type === 'notification') {
        notifications = notifications.filter(n => n.id !== id);
    } else {
        announcements = announcements.filter(n => n.id !== id);
    }
    
    renderNotifications();
    renderAnnouncements();
    renderTrash();
    updateStats();
    showToast('Moved to trash', 'success');
}

// Restore Item
function restoreItem(id) {
    const idx = trash.findIndex(n => n.id === id);
    if (idx === -1) return;
    
    const item = trash[idx];
    const type = item.originalType || 'notification';
    const { deletedAt, originalType, ...restored } = item;
    
    if (type === 'notification') notifications.push(restored);
    else announcements.push(restored);
    
    trash.splice(idx, 1);
    saveTrash();
    
    renderNotifications();
    renderAnnouncements();
    renderTrash();
    updateStats();
    showToast('Restored', 'success');
}

// Permanent Delete
function permanentDelete(id) {
    if (!confirm('Delete permanently? This cannot be undone.')) return;
    
    trash = trash.filter(n => n.id !== id);
    saveTrash();
    renderTrash();
    updateStats();
    showToast('Deleted permanently', 'error');
}

// Clear All Modal
function showClearModal(type) {
    const count = type === 'notification' ? notifications.length : announcements.length;
    document.getElementById('clearMsg').textContent = `Move all ${count} ${type}(s) to trash?`;
    document.getElementById('clearModal').classList.add('active');
}

// Execute Clear
function executeClear() {
    const items = clearType === 'notification' ? notifications : announcements;
    items.forEach(item => {
        trash.push({ ...item, deletedAt: new Date().toISOString(), originalType: clearType });
    });
    if (clearType === 'notification') notifications = [];
    else announcements = [];
    
    saveTrash();
    closeModal('clearModal');
    renderNotifications();
    renderAnnouncements();
    renderTrash();
    updateStats();
    showToast(`All ${clearType}s moved to trash`, 'success');
}

// Restore All
function restoreAll() {
    if (trash.length === 0) {
        showToast('Trash is already empty', 'warning');
        return;
    }
    
    trash.forEach(item => {
        const type = item.originalType || 'notification';
        const { deletedAt, originalType, ...restored } = item;
        if (type === 'notification') notifications.push(restored);
        else announcements.push(restored);
    });
    
    trash = [];
    saveTrash();
    renderNotifications();
    renderAnnouncements();
    renderTrash();
    updateStats();
    showToast('All items restored', 'success');
}

// Empty Trash Modal
function showEmptyTrashModal() {
    if (trash.length === 0) {
        showToast('Trash is already empty', 'warning');
        return;
    }
    document.getElementById('emptyTrashModal').classList.add('active');
}

// Empty Trash
function emptyTrash() {
    if (trash.length === 0) {
        showToast('Trash is already empty', 'warning');
        closeModal('emptyTrashModal');
        return;
    }
    
    trash = [];
    saveTrash();
    closeModal('emptyTrashModal');
    renderTrash();
    updateStats();
    showToast('Trash emptied permanently', 'success');
}

// Render Notifications
function renderNotifications() {
    const list = document.getElementById('notifList');
    const empty = document.getElementById('notifEmpty');
    
    if (notifications.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    list.innerHTML = notifications.map(item => {
        const expanded = expandedItems.has(`n-${item.id}`);
        return `
        <div class="item-card ${item.severity} ${expanded ? 'expanded' : ''}" onclick="toggleExpand('n-${item.id}')">
            <div class="item-header">
                <div class="item-title-section">
                    <div class="item-icon"><i class="${getIcon(item.type)}"></i></div>
                    <div class="item-title">${item.title}</div>
                </div>
                <div class="item-meta">
                    <span class="badge ${item.severity}">${item.severity}</span>
                    <span class="badge-time"><i class="far fa-clock"></i> ${formatDate(item.createdAt)}</span>
                </div>
            </div>
            <div class="expanded-content">
                <p class="full-message">${item.message}</p>
                <div class="item-actions" onclick="event.stopPropagation()">
                    <button class="action-btn delete" onclick="deleteItem('${item.id}','notification')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
            ${!expanded ? '<div class="view-hint"><i class="far fa-clock"></i> Click to view full message</div>' : ''}
        </div>`;
    }).join('');
}

// Render Announcements
function renderAnnouncements() {
    const list = document.getElementById('annList');
    const empty = document.getElementById('annEmpty');
    
    if (announcements.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    list.innerHTML = announcements.map(item => {
        const expanded = expandedItems.has(`a-${item.id}`);
        return `
        <div class="item-card ${item.severity} ${expanded ? 'expanded' : ''}" onclick="toggleExpand('a-${item.id}')">
            <div class="item-header">
                <div class="item-title-section">
                    <div class="item-icon"><i class="${getIcon(item.type)}"></i></div>
                    <div class="item-title">${item.title}</div>
                </div>
                <div class="item-meta">
                    <span class="badge ${item.severity}">${item.severity}</span>
                    <span class="badge-time"><i class="far fa-clock"></i> ${formatDate(item.createdAt)}</span>
                </div>
            </div>
            <div class="expanded-content">
                <p class="full-message">${item.message}</p>
                <div class="item-actions" onclick="event.stopPropagation()">
                    <button class="action-btn delete" onclick="deleteItem('${item.id}','announcement')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
            ${!expanded ? '<div class="view-hint"><i class="far fa-clock"></i> Click to view full message</div>' : ''}
        </div>`;
    }).join('');
}

// Render Trash
function renderTrash() {
    const list = document.getElementById('trashList');
    const empty = document.getElementById('trashEmpty');
    
    if (trash.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    
    list.innerHTML = trash.map(item => {
        const expanded = expandedItems.has(`t-${item.id}`);
        return `
        <div class="item-card trash ${expanded ? 'expanded' : ''}" onclick="toggleExpand('t-${item.id}')">
            <div class="item-header">
                <div class="item-title-section">
                    <div class="item-icon"><i class="${getIcon(item.type)}"></i></div>
                    <div class="item-title">${item.title}</div>
                </div>
                <div class="item-meta">
                    <span class="badge">${item.originalType||'notification'}</span>
                    <span class="badge-time"><i class="fas fa-trash"></i> ${formatDate(item.deletedAt)}</span>
                </div>
            </div>
            <div class="expanded-content">
                <p class="full-message">${item.message}</p>
                <div class="item-actions">
                    <button class="action-btn restore" onclick="restoreItem('${item.id}')"><i class="fas fa-undo"></i> Restore</button>
                    <button class="action-btn delete" onclick="permanentDelete('${item.id}')"><i class="fas fa-trash-alt"></i> Delete Forever</button>
                </div>
            </div>
            <div class="view-hint"><i class="far fa-clock"></i> Click to view details</div>
        </div>`;
    }).join('');
}

// Toggle Expand
function toggleExpand(id) {
    if (expandedItems.has(id)) expandedItems.delete(id);
    else expandedItems.add(id);
    if (id.startsWith('n-')) renderNotifications();
    else if (id.startsWith('a-')) renderAnnouncements();
    else renderTrash();
}

// Filters
function filterNotifications() {
    const search = document.getElementById('notifSearch').value.toLowerCase();
    const severity = document.getElementById('notifSeverity').value;
    
    const filtered = notifications.filter(item => {
        const matchSearch = item.title.toLowerCase().includes(search) || item.message.toLowerCase().includes(search);
        const matchSev = !severity || item.severity === severity;
        return matchSearch && matchSev;
    });
    
    // Re-render with filtered
    const list = document.getElementById('notifList');
    if (filtered.length === 0) {
        list.innerHTML = '';
        document.getElementById('notifEmpty').style.display = 'block';
    } else {
        document.getElementById('notifEmpty').style.display = 'none';
        list.innerHTML = filtered.map(item => {
            const expanded = expandedItems.has(`n-${item.id}`);
            return `
            <div class="item-card ${item.severity} ${expanded ? 'expanded' : ''}" onclick="toggleExpand('n-${item.id}')">
                <div class="item-header">
                    <div class="item-title-section">
                        <div class="item-icon"><i class="${getIcon(item.type)}"></i></div>
                        <div class="item-title">${item.title}</div>
                    </div>
                    <div class="item-meta">
                        <span class="badge ${item.severity}">${item.severity}</span>
                        <span class="badge-time"><i class="far fa-clock"></i> ${formatDate(item.createdAt)}</span>
                    </div>
                </div>
                <div class="expanded-content">
                    <p class="full-message">${item.message}</p>
                    <div class="item-actions" onclick="event.stopPropagation()">
                        <button class="action-btn delete" onclick="deleteItem('${item.id}','notification')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                ${!expanded ? '<div class="view-hint"><i class="far fa-clock"></i> Click to view full message</div>' : ''}
            </div>`;
        }).join('');
    }
}

function filterAnnouncements() {
    const search = document.getElementById('annSearch').value.toLowerCase();
    const severity = document.getElementById('annSeverity').value;
    
    const filtered = announcements.filter(item => {
        const matchSearch = item.title.toLowerCase().includes(search) || item.message.toLowerCase().includes(search);
        const matchSev = !severity || item.severity === severity;
        return matchSearch && matchSev;
    });
    
    const list = document.getElementById('annList');
    if (filtered.length === 0) {
        list.innerHTML = '';
        document.getElementById('annEmpty').style.display = 'block';
    } else {
        document.getElementById('annEmpty').style.display = 'none';
        list.innerHTML = filtered.map(item => {
            const expanded = expandedItems.has(`a-${item.id}`);
            return `
            <div class="item-card ${item.severity} ${expanded ? 'expanded' : ''}" onclick="toggleExpand('a-${item.id}')">
                <div class="item-header">
                    <div class="item-title-section">
                        <div class="item-icon"><i class="${getIcon(item.type)}"></i></div>
                        <div class="item-title">${item.title}</div>
                    </div>
                    <div class="item-meta">
                        <span class="badge ${item.severity}">${item.severity}</span>
                        <span class="badge-time"><i class="far fa-clock"></i> ${formatDate(item.createdAt)}</span>
                    </div>
                </div>
                <div class="expanded-content">
                    <p class="full-message">${item.message}</p>
                    <div class="item-actions" onclick="event.stopPropagation()">
                        <button class="action-btn delete" onclick="deleteItem('${item.id}','announcement')"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
                ${!expanded ? '<div class="view-hint"><i class="far fa-clock"></i> Click to view full message</div>' : ''}
            </div>`;
        }).join('');
    }
}

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
}

// Modal Close
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Update Stats
function updateStats() {
    document.getElementById('urgentNum').textContent = notifications.filter(n=>n.severity==='urgent').length;
    document.getElementById('importantNum').textContent = notifications.filter(n=>n.severity==='important').length;
    document.getElementById('normalNum').textContent = notifications.filter(n=>n.severity==='normal').length;
    document.getElementById('trashTotal').textContent = trash.length;
    document.getElementById('trashNotif').textContent = trash.filter(n=>n.originalType==='notification').length;
    document.getElementById('trashAnn').textContent = trash.filter(n=>n.originalType==='announcement').length;
    document.getElementById('notifCount').textContent = notifications.length;
    document.getElementById('annCount').textContent = announcements.length;
    document.getElementById('trashCount').textContent = trash.length;
}

// Utilities
function getIcon(type) {
    const icons = { payment:'fas fa-credit-card', hostel:'fas fa-building', academic:'fas fa-graduation-cap', complaint:'fas fa-exclamation-triangle', general:'fas fa-info-circle', exam:'fas fa-file-alt', event:'fas fa-calendar-alt', holiday:'fas fa-umbrella-beach' };
    return icons[type] || 'fas fa-bell';
}

function formatDate(str) {
    const d = new Date(str), now = new Date(), diff = now - d;
    const mins = Math.floor(diff/60000), hrs = Math.floor(diff/3600000), days = Math.floor(diff/86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function showToast(msg, type='success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// Close modals on outside click
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) e.target.classList.remove('active');
};