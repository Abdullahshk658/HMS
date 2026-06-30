/**
 * SmartDormX - Requests & Complaints Page
 * Production Ready with LocalStorage Backend
 * 
 * Features:
 * - Direct delete to trash (no confirmation)
 * - Trash confirmation modal preserved
 * - Toasts only for empty trash scenarios
 * - Full responsive UI updates
 */

// ═══════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════

// Load data from LocalStorage or initialize empty arrays
let requests = JSON.parse(localStorage.getItem('sd_requests')) || [];
let trash = JSON.parse(localStorage.getItem('sd_trash')) || [];

let currentRequestId = null;
let pendingAction = null;

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    // Initial render of all sections
    updateBadges();
    renderHistory();
    renderTrash();
    
    // Character counter setup
    const descriptionField = document.getElementById('description');
    if (descriptionField) {
        descriptionField.addEventListener('input', function() {
            const charCount = document.getElementById('charCount');
            if (charCount) charCount.textContent = this.value.length;
        });
    }

    console.log('✅ SmartDormX Requests Page Initialized');
    console.log(`📦 Loaded: ${requests.length} requests, ${trash.length} in trash`);
});

// ═══════════════════════════════════════════
// SIDEBAR & NAVIGATION
// ═══════════════════════════════════════════

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function switchTab(tabName) {
    // Deactivate all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(section => section.classList.remove('active'));
    
    // Activate selected tab
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const targetSection = document.getElementById(`${tabName}Tab`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetSection) targetSection.classList.add('active');
    
    // Re-render if switching to history or trash to ensure fresh data
    if (tabName === 'history') renderHistory();
    if (tabName === 'trash') renderTrash();
}

// ═══════════════════════════════════════════
// FORM HANDLING
// ═══════════════════════════════════════════

function toggleSeverityOptions() {
    const type = document.getElementById('requestType')?.value;
    const severityGroup = document.getElementById('severityGroup');
    if (severityGroup) {
        severityGroup.style.display = (type === 'complaint') ? 'block' : 'none';
    }
}

function handleSubmit(e) {
    e.preventDefault();
    
    const newRequest = {
        id: Date.now(),
        type: document.getElementById('requestType').value,
        category: document.getElementById('category').value,
        subject: document.getElementById('subject').value.trim(),
        description: document.getElementById('description').value.trim(),
        severity: document.getElementById('severity')?.value || 'medium',
        status: 'pending', // Default status
        date: new Date().toISOString(),
        studentName: 'Fahad Ali', // Should come from auth/session
        studentId: 'B22F0403CS046'
    };

    // Add to requests array
    requests.unshift(newRequest); // Add to top of list
    saveToLocalStorage();
    
    // UI Updates
    resetForm();
    updateBadges();
    renderHistory();
    
    // Optional: Switch to history tab to see the new request
    // switchTab('history');
}

function resetForm() {
    const form = document.getElementById('requestForm');
    if (form) form.reset();
    
    const charCount = document.getElementById('charCount');
    if (charCount) charCount.textContent = '0';
    
    const severityGroup = document.getElementById('severityGroup');
    if (severityGroup) severityGroup.style.display = 'none';
}

function updateCharCount() {
    const desc = document.getElementById('description');
    const count = document.getElementById('charCount');
    if (desc && count) count.textContent = desc.value.length;
}

// ═══════════════════════════════════════════
// HISTORY RENDERING
// ═══════════════════════════════════════════

function renderHistory() {
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    
    if (!historyList || !historyEmpty) return;
    
    // Check if we have any requests
    if (requests.length === 0) {
        historyList.innerHTML = '';
        historyEmpty.style.display = 'block';
        return;
    }
    
    // Hide empty state
    historyEmpty.style.display = 'none';
    
    // Render requests
    historyList.innerHTML = requests.map(request => `
        <div class="request-item ${request.type}" data-id="${request.id}" onclick="viewDetails(${request.id})">
            <div class="request-header">
                <div>
                    <div class="request-title">${escapeHtml(request.subject)}</div>
                    <div class="request-meta">
                        <i class="fas fa-tag"></i> ${capitalize(request.type)} | 
                        <i class="fas fa-folder"></i> ${capitalize(request.category)} | 
                        <i class="fas fa-calendar"></i> ${formatDate(request.date)}
                    </div>
                </div>
                <span class="request-status status-${request.status}">${capitalize(request.status)}</span>
            </div>
            <p style="color: var(--gray-500); margin-bottom: 1rem; font-size: 14px; line-height: 1.5;">
                ${escapeHtml(request.description.substring(0, 120))}${request.description.length > 120 ? '...' : ''}
            </p>
            <div class="request-actions" onclick="event.stopPropagation()">
                <button class="btn btn-primary btn-sm" onclick="viewDetails(${request.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteRequestDirect(${request.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function filterHistory() {
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('historyTypeFilter')?.value || '';
    const statusFilter = document.getElementById('historyStatusFilter')?.value || '';
    
    const filtered = requests.filter(request => {
        const matchesSearch = request.subject.toLowerCase().includes(searchTerm) || 
                              request.description.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || request.type === typeFilter;
        const matchesStatus = !statusFilter || request.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });
    
    renderFilteredHistory(filtered);
}

function renderFilteredHistory(filteredRequests) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (filteredRequests.length === 0) {
        historyList.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No requests found matching your criteria.</p></div>';
        return;
    }
    
    historyList.innerHTML = filteredRequests.map(request => `
        <div class="request-item ${request.type}" onclick="viewDetails(${request.id})">
            <div class="request-header">
                <div>
                    <div class="request-title">${escapeHtml(request.subject)}</div>
                    <div class="request-meta">
                        <i class="fas fa-tag"></i> ${capitalize(request.type)} | 
                        <i class="fas fa-folder"></i> ${capitalize(request.category)}
                    </div>
                </div>
                <span class="request-status status-${request.status}">${capitalize(request.status)}</span>
            </div>
            <div class="request-actions" onclick="event.stopPropagation()">
                <button class="btn btn-primary btn-sm" onclick="viewDetails(${request.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

function resetHistoryFilters() {
    if (document.getElementById('historySearch')) document.getElementById('historySearch').value = '';
    if (document.getElementById('historyTypeFilter')) document.getElementById('historyTypeFilter').value = '';
    if (document.getElementById('historyStatusFilter')) document.getElementById('historyStatusFilter').value = '';
    renderHistory();
}

// ═══════════════════════════════════════════
// TRASH RENDERING
// ═══════════════════════════════════════════

function renderTrash() {
    const trashList = document.getElementById('trashList');
    const trashEmpty = document.getElementById('trashEmpty');
    const emptyTrashBtn = document.getElementById('emptyTrashBtn');
    const restoreAllBtn = document.getElementById('restoreAllBtn');
    
    if (!trashList || !trashEmpty) return;
    
    if (trash.length === 0) {
        trashList.innerHTML = '';
        trashEmpty.style.display = 'block';
        if (emptyTrashBtn) emptyTrashBtn.disabled = true;
        if (restoreAllBtn) restoreAllBtn.disabled = true;
        return;
    }
    
    trashEmpty.style.display = 'none';
    if (emptyTrashBtn) emptyTrashBtn.disabled = false;
    if (restoreAllBtn) restoreAllBtn.disabled = false;
    
    trashList.innerHTML = trash.map(item => `
        <div class="request-item ${item.type} trashed">
            <div class="request-header">
                <div>
                    <div class="request-title">${escapeHtml(item.subject)}</div>
                    <div class="request-meta">
                        <i class="fas fa-trash"></i> Deleted: ${formatDate(item.deletedDate)}
                    </div>
                </div>
            </div>
            <div class="request-actions">
                <button class="btn btn-secondary btn-sm" onclick="restoreItem(${item.id})">
                    <i class="fas fa-undo"></i> Restore
                </button>
                <button class="btn btn-danger btn-sm" onclick="permanentDelete(${item.id})">
                    <i class="fas fa-times-circle"></i> Delete Forever
                </button>
            </div>
        </div>
    `).join('');
}

function filterTrash() {
    const searchTerm = (document.getElementById('trashSearch')?.value || '').toLowerCase();
    const filtered = trash.filter(item => 
        item.subject.toLowerCase().includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm)
    );
    
    const trashList = document.getElementById('trashList');
    if (!trashList) return;
    
    if (filtered.length === 0) {
        trashList.innerHTML = '<div class="empty-state" style="padding: 20px;"><p>No items found in trash.</p></div>';
    } else {
        // Re-render with filtered list temporarily (doesn't affect state)
        trashList.innerHTML = filtered.map(item => `
            <div class="request-item ${item.type} trashed">
                <div class="request-header">
                    <div>
                        <div class="request-title">${escapeHtml(item.subject)}</div>
                        <div class="request-meta">
                            <i class="fas fa-trash"></i> Deleted: ${formatDate(item.deletedDate)}
                        </div>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn btn-secondary btn-sm" onclick="restoreItem(${item.id})">
                        <i class="fas fa-undo"></i> Restore
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="permanentDelete(${item.id})">
                        <i class="fas fa-times-circle"></i> Delete Forever
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// ═══════════════════════════════════════════
// ACTIONS (CRITICAL FIXES HERE)
// ═══════════════════════════════════════════

// View Details Modal
function viewDetails(id) {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    
    currentRequestId = id;
    const modalBody = document.getElementById('detailModalBody');
    
    if (modalBody) {
        modalBody.innerHTML = `
            <div style="line-height: 1.8; color: var(--gray-700);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div><strong style="color: var(--gray-500); font-size: 12px;">Type</strong><br>${capitalize(request.type)}</div>
                    <div><strong style="color: var(--gray-500); font-size: 12px;">Category</strong><br>${capitalize(request.category)}</div>
                    <div><strong style="color: var(--gray-500); font-size: 12px;">Status</strong><br><span class="request-status status-${request.status}">${capitalize(request.status)}</span></div>
                    ${request.severity ? `<div><strong style="color: var(--gray-500); font-size: 12px;">Priority</strong><br>${capitalize(request.severity)}</div>` : ''}
                    <div style="grid-column: span 2;"><strong style="color: var(--gray-500); font-size: 12px;">Date</strong><br>${new Date(request.date).toLocaleString()}</div>
                </div>
                <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--gray-200);">
                <h4 style="margin-bottom: 8px; color: var(--dark);">Description</h4>
                <div style="background: var(--gray-50); padding: 16px; border-radius: 8px; white-space: pre-wrap; border: 1px solid var(--gray-200);">
                    ${escapeHtml(request.description)}
                </div>
            </div>
        `;
    }
    
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// ✅ DIRECT DELETE (No Confirmation)
function deleteRequestDirect(id) {
    const index = requests.findIndex(r => r.id === id);
    if (index === -1) return;
    
    // Get the item and add deleted timestamp
    const item = requests[index];
    item.deletedDate = new Date().toISOString();
    
    // Move to trash and remove from requests
    trash.unshift(item);
    requests.splice(index, 1);
    
    // Save and update UI
    saveToLocalStorage();
    updateBadges();
    renderHistory();
    renderTrash();
    
    // Close detail modal if open
    closeModal('detailModal');
}

// Restore single item
function restoreItem(id) {
    const itemIndex = trash.findIndex(t => t.id === id);
    if (itemIndex === -1) return;
    
    const item = trash[itemIndex];
    delete item.deletedDate; // Remove deleted timestamp
    
    // Move back to requests
    requests.unshift(item);
    trash.splice(itemIndex, 1);
    
    saveToLocalStorage();
    updateBadges();
    renderHistory();
    renderTrash();
}

// Restore ALL items
function restoreAll() {
    // ✅ Show toast if trash is empty
    if (trash.length === 0) {
        showToast('Nothing to restore', 'warning');
        return;
    }
    
    // Move all trash items back to requests
    trash.forEach(item => { 
        delete item.deletedDate; 
        requests.unshift(item); 
    });
    
    trash = []; // Clear trash
    
    saveToLocalStorage();
    updateBadges();
    renderHistory();
    renderTrash();
}

// Permanent delete single item
function permanentDelete(id) {
    const index = trash.findIndex(t => t.id === id);
    if (index === -1) return;
    
    trash.splice(index, 1);
    saveToLocalStorage();
    updateBadges();
    renderTrash();
}

// Confirm Empty Trash (with Modal)
function confirmEmptyTrash() {
    // ✅ Show toast if trash is already empty
    if (trash.length === 0) {
        showToast('Nothing in trash', 'warning');
        return;
    }
    
    const confirmEmptyCheck = document.getElementById('confirmEmptyCheck');
    const finalEmptyBtn = document.getElementById('finalEmptyBtn');
    const modal = document.getElementById('emptyTrashModal');
    
    if (confirmEmptyCheck) confirmEmptyCheck.checked = false;
    if (finalEmptyBtn) finalEmptyBtn.disabled = true;
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function toggleEmptyTrashBtn() {
    const checked = document.getElementById('confirmEmptyCheck')?.checked;
    const finalEmptyBtn = document.getElementById('finalEmptyBtn');
    if (finalEmptyBtn) finalEmptyBtn.disabled = !checked;
}

// Perform Empty Trash
function performEmptyTrash() {
    trash = [];
    saveToLocalStorage();
    updateBadges();
    renderTrash();
    closeModal('emptyTrashModal');
}

// Confirm Clear All History
function confirmClearAllHistory() {
    if (requests.length === 0) return;
    
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const modal = document.getElementById('confirmModal');
    
    if (confirmTitle) confirmTitle.textContent = 'Clear All History';
    if (confirmMessage) confirmMessage.textContent = `Are you sure you want to move ${requests.length} request(s) to trash?`;
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    pendingAction = 'clearAllHistory';
}

// Execute Confirmed Action
function executeConfirmedAction() {
    closeModal('confirmModal');
    
    if (pendingAction === 'clearAllHistory') {
        // Move all requests to trash
        const now = new Date().toISOString();
        requests.forEach(r => { r.deletedDate = now; trash.unshift(r); });
        requests = [];
        
        saveToLocalStorage();
        updateBadges();
        renderHistory();
        renderTrash();
    }
    
    pendingAction = null;
    currentRequestId = null;
}

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════

function saveToLocalStorage() {
    localStorage.setItem('sd_requests', JSON.stringify(requests));
    localStorage.setItem('sd_trash', JSON.stringify(trash));
}

function updateBadges() {
    const historyBadge = document.getElementById('historyBadge');
    const trashBadge = document.getElementById('trashBadge');
    if (historyBadge) historyBadge.textContent = requests.length;
    if (trashBadge) trashBadge.textContent = trash.length;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Minimal Toast (Only for empty trash scenarios)
function showToast(message, type = 'warning') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    
    // Auto remove after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper: Capitalize first letter
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper: Format Date
function formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Event Listeners for closing modals
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal('detailModal');
        closeModal('confirmModal');
        closeModal('emptyTrashModal');
    }
});