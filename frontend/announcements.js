/**
=====================================================
SMARTDORMX - ANNOUNCEMENTS PAGE JAVASCRIPT
Updated Logic: Red border toggle on Preview click & global click
===================================================== */

// Global Variables
const STORAGE_KEY = 'smartdormx_announcements';
let announcements = [];
let previewData = null;
let confirmCallback = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAnnouncements();
    renderHistory();
    updateStats();
    setupCharCounter();
    setupEventListeners();
    setupGlobalClickClear(); // New Logic
});

// =====================
// GLOBAL CLICK LISTENER (Removes Red Borders)
// =====================
function setupGlobalClickClear() {
    document.addEventListener('click', function(e) {
        // Identify if we clicked the Preview Button
        // We check for the specific onclick attribute or class
        const isPreviewButton = e.target.closest('[onclick="showPreview()"]') || 
            (e.target.closest('button') && e.target.closest('button').classList.contains('btn-primary') && e.target.closest('form'));
        
        // If we did NOT click the Preview button, remove all error borders
        if (!isPreviewButton) {
            document.querySelectorAll('.error').forEach(el => {
                el.classList.remove('error');
            });
        }
    });
}

// =====================
// LOCAL STORAGE
// =====================
/**
Load announcements from Supabase (with localStorage fallback)
*/
async function loadAnnouncements() {
    try {
        console.log('🔄 Loading announcements from Supabase...');
        // Try Supabase first
        const { data, error } = await window.supabaseClient
            .from('announcements')
            .select('*')
            .order('published_at', { ascending: false });

        if (error) throw error;

        // Update global state
        window.announcements = data || [];

        // Update UI
        updateStats();
        renderHistory();

        console.log(`✅ Loaded ${window.announcements.length} announcements from Supabase`);
    } catch (err) {
        console.warn('⚠️ Falling back to localStorage for announcements');
        // Original localStorage fallback logic
        try {
            const stored = localStorage.getItem('smartdormx_announcements');
            window.announcements = stored ? JSON.parse(stored) : [];
            updateStats();
            renderHistory();
            await updateAnnouncementStats(); // Also update stats for fallback
        } catch (e) {
            console.error('❌ Fallback also failed:', e);
            window.announcements = [];
        }
    }
}

function saveAnnouncements() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
    } catch (e) {
        console.error('Error saving announcements:', e);
    }
}

// =====================
// UPDATE STATS
// =====================
function updateStats() {
    const today = new Date().toDateString();

     // ✅ Use window.announcements with fallback
    const announcementsList = window.announcements || [];
    
    // Total announcements
    const totalEl = document.getElementById('totalAnnouncements');
    if(totalEl) totalEl.textContent = window.announcements.length;

    // Total recipients (estimate)
    let totalRecipients = 0;
    window.announcements.forEach(ann => {
        const target = ann.target_audience || ann.target || 'all';
        if (target === 'all') totalRecipients += 150;
        else totalRecipients += 75;
    });
    const recipEl = document.getElementById('totalRecipients');
    if(recipEl) recipEl.textContent = totalRecipients;

    // Urgent count
    const urgentCount = window.announcements.filter(a => 
        a.priority === 'urgent' || a.priority === 'high'
    ).length;
    const urgentEl = document.getElementById('urgentCount');
    if(urgentEl) urgentEl.textContent = urgentCount;

    // Today's count
    const todayCount = window.announcements.filter(a => {
        const dateStr = a.published_at || a.timestamp || a.created_at;
        return dateStr && new Date(dateStr).toDateString() === today;
    }).length;
    const todayEl = document.getElementById('todayCount');
    if(todayEl) todayEl.textContent = todayCount;

    // Update history count badge
    const histCount = document.getElementById('historyCount');
    if(histCount) histCount.textContent = `${window.announcements.length} sent`;
}

// =====================
// EVENT LISTENERS
// =====================
function setupEventListeners() {
    // Form submission prevention
    const form = document.getElementById('announceForm');
    if (form) {
        form.addEventListener('submit', (e) => e.preventDefault());
    }
}

// =====================
// CHARACTER COUNTER
// =====================
function setupCharCounter() {
    const messageInput = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    
    if (messageInput && charCount) {
        messageInput.addEventListener('input', () => {
            const count = messageInput.value.length;
            charCount.textContent = count;
            
            if (count > 1800) {
                charCount.style.color = '#ef4444';
            } else if (count > 1500) {
                charCount.style.color = '#f59e0b';
            } else {
                charCount.style.color = '';
            }
        });
    }
}

// =====================
// VALIDATION (Adds Red Border)
// =====================
// Scroll to form
function scrollToForm() {
    const formCard = document.querySelector('.announce-card');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the form
        formCard.style.animation = 'pulse 1s ease';
        setTimeout(() => {
            formCard.style.animation = '';
        }, 1000);
    }
}

// View history
function viewHistory() {
    const historyCard = document.querySelector('.history-card');
    if (historyCard) {
        historyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        historyCard.style.animation = 'highlight 1.5s ease';
        setTimeout(() => {
            historyCard.style.animation = '';
        }, 1500);
    }
}

// Add pulse animation
const style = document.createElement('style');
style.textContent = `@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); } 50% { box-shadow: 0 0 0 20px rgba(79, 70, 229, 0); } } @keyframes highlight { 0%, 100% { background: white; } 50% { background: #eef2ff; } }`;
document.head.appendChild(style);

function validateForm() {
    let isValid = true;
    const subjectInput = document.getElementById('subject');
    const messageInput = document.getElementById('message');
    const targetSelect = document.getElementById('targetDept');

    // Reset errors first to re-validate fresh
    // Note: The global click listener will remove them later if user clicks away
    subjectInput.classList.remove('error');
    messageInput.classList.remove('error');
    targetSelect.classList.remove('error');

    // Validate Target Audience
    if (!targetSelect.value) {
        targetSelect.classList.add('error');
        isValid = false;
    }

    // Validate Subject
    if (!subjectInput.value.trim()) {
        subjectInput.classList.add('error');
        isValid = false;
    }

    // Validate Message
    if (!messageInput.value.trim()) {
        messageInput.classList.add('error');
        isValid = false;
    }

    // Scroll to first error if failed
    if (!isValid) {
        const firstError = document.querySelector('.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    return isValid;
}

// =====================
// PREVIEW FUNCTIONALITY
// =====================
function showPreview() {
    // Validate form first
    // If validation fails, it adds .error class.
    // The global listener will NOT remove it because we are clicking the preview button.
    if (!validateForm()) {
        return;
    }

    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    const target = document.getElementById('targetDept').value;
    const priority = document.getElementById('priority').value;

    // Get target label
    const targetSelect = document.getElementById('targetDept');
    const targetLabel = targetSelect.options[targetSelect.selectedIndex].text;

    // Calculate recipients
    let recipientCount = '150';
    if (target === 'girls') recipientCount = '75';
    if (target === 'boys') recipientCount = '75';

    // Store preview data
    previewData = {
        subject,
        message,
        target,
        targetLabel,
        priority,
        timestamp: new Date().toISOString(),
        sender: 'Nabeel Ashraf'
    };

    // Update preview modal content
    document.getElementById('previewSubject').textContent = subject;
    document.getElementById('previewMessage').textContent = message;
    document.getElementById('previewTarget').textContent = targetLabel;
    document.getElementById('previewTime').textContent = formatDateTime(previewData.timestamp);
    document.getElementById('previewRecipients').textContent = `${recipientCount} ${target === 'all' ? 'Residents' : target === 'girls' ? 'Girls' : 'Boys'}`;

    // Set priority indicator
    const priorityColors = {
        'normal': '#3b82f6',
        'important': '#f59e0b',
        'urgent': '#ef4444'
    };

    const priorityLabels = {
        'normal': 'Normal',
        'important': 'Important',
        'urgent': 'Urgent'
    };

    const priorityBar = document.getElementById('previewPriorityBar');
    const priorityBadge = document.getElementById('previewPriorityBadge');

    priorityBar.style.borderLeftColor = priorityColors[priority];
    priorityBadge.textContent = priorityLabels[priority];
    priorityBadge.style.background = priority === 'normal' ? '#e2e8f0' : priority === 'important' ? '#fef3c7' : '#fee2e2';
    priorityBadge.style.color = priority === 'normal' ? '#475569' : priority === 'important' ? '#d97706' : '#dc2626';

    // Show preview modal
    document.getElementById('previewModal').classList.add('active');
}

function closePreview() {
    document.getElementById('previewModal').classList.remove('active');
    previewData = null;
}

// Toast Notification Functions
function showToast(type, title, message) {
    // Ensure toast container exists
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="${icons[type]} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        }
    }, 5000);
}

function showSuccessToast(title, message) {
    showToast('success', title, message);
}

function showErrorToast(title, message) {
    showToast('error', title, message);
}

function showWarningToast(title, message) {
    showToast('warning', title, message);
}

/**
Send announcement to Supabase (with localStorage fallback)
*/
async function sendFromPreview() {
    if (!previewData) {
        showErrorToast('Error', 'No preview data available');
        return;
    }

    try {
        // Show loading state
        const sendBtn = document.querySelector('#previewModal .btn-primary');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        // Create the announcement
        await createAnnouncement({
            subject: previewData.subject,
            message: previewData.message,
            target: previewData.target,
            priority: previewData.priority
        });

        // Close preview and reset form
        closePreview();
        resetForm();

        // Show success message
        showSuccessToast('✓ Sent', 'Announcement broadcast successfully!');

        // Refresh the history and stats
        await loadAnnouncements();
    } catch (error) {
        console.error('Error sending announcement:', error);
        showErrorToast('Error', error.message || 'Failed to send announcement');
    } finally {
        // Re-enable button
        const sendBtn = document.querySelector('#previewModal .btn-primary');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = 'Confirm & Send Now';
        }
    }
}

async function updateAnnouncementStats() {
  try {
    console.log('🔄 Updating announcement stats...');
    
    const { data: announcements, error } = await window.supabaseClient
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
    
    const announcementsList = announcements || [];
    console.log(`📊 Fetched ${announcementsList.length} announcements`);
    
    if (announcementsList.length === 0) {
      // ✅ Safe null checks for all elements
      const totalSentEl = document.getElementById('totalAnnouncements');
      const totalRecipientsEl = document.getElementById('totalRecipients');
      const urgentAlertsEl = document.getElementById('urgentCount');
      const todayPostsEl = document.getElementById('todayCount');
      
      if (totalSentEl) totalSentEl.textContent = '0';
      if (totalRecipientsEl) totalRecipientsEl.textContent = '0';
      if (urgentAlertsEl) urgentAlertsEl.textContent = '0';
      if (todayPostsEl) todayPostsEl.textContent = '0';
      return;
    }
    
    // Calculate statistics
    const totalSent = announcementsList.length;
    
    let totalRecipients = 0;
    announcementsList.forEach(ann => {
      const audience = ann.target_audience || ann.target || 'all';
      if (audience === 'all') totalRecipients += 150;
      else if (audience === 'boys' || audience === 'girls') totalRecipients += 75;
      else totalRecipients += 1;
    });
    
    const urgentAlerts = announcementsList.filter(ann => 
      ann.priority === 'urgent' || ann.priority === 'high'
    ).length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayPosts = announcementsList.filter(ann => {
      const annDate = new Date(ann.published_at || ann.created_at).toISOString().split('T')[0];
      return annDate === today;
    }).length;
    
    // ✅ Update DOM with safe null checks
    const totalSentEl = document.getElementById('totalAnnouncements');
    const totalRecipientsEl = document.getElementById('totalRecipients');
    const urgentAlertsEl = document.getElementById('urgentCount');
    const todayPostsEl = document.getElementById('todayCount');
    
    if (totalSentEl) totalSentEl.textContent = totalSent;
    if (totalRecipientsEl) totalRecipientsEl.textContent = totalRecipients;
    if (urgentAlertsEl) urgentAlertsEl.textContent = urgentAlerts;
    if (todayPostsEl) todayPostsEl.textContent = todayPosts;
    
    console.log('✓ Stats updated:', { totalSent, totalRecipients, urgentAlerts, todayPosts });
    
  } catch (error) {
    console.error('Error updating stats:', error);
    // Don't show toast on every error to avoid spam
  }
}

async function createAnnouncement(announcementData) {
    // Validate data first
    if (!announcementData.subject || !announcementData.subject.trim()) {
        throw new Error('Subject is required');
    }
    if (!announcementData.message || !announcementData.message.trim()) {
        throw new Error('Message is required');
    }

    try {
        // Get admin profile for sender name
        let senderName = 'Nabeel Ashraf'; // Default fallback
        
        try {
            const { data: profile } = await window.supabaseClient
                .from('admin_profiles')
                .select('full_name')
                .eq('email', 'admin@smartdormx.com')
                .single();
            
            if (profile && profile.full_name) {
                senderName = profile.full_name;
            }
        } catch (profileError) {
            console.warn('Could not fetch admin profile, using default name');
        }
        
        // Prepare announcement data
        const announcement = {
            subject: announcementData.subject.trim(),
            message: announcementData.message.trim(),
            target_audience: announcementData.target || 'all',
            priority: announcementData.priority || 'normal',
            sender_name: senderName,
            published_at: new Date().toISOString()
        };
        
        // Insert into Supabase
        const { data, error } = await window.supabaseClient
            .from('announcements')
            .insert([announcement])
            .select();
        
        if (error) {
            console.error('Supabase error:', error);
            throw new Error(error.message || 'Failed to save announcement');
        }
        
        if (!data || data.length === 0) {
            throw new Error('No data returned from database');
        }
        
        console.log('✓ Announcement created:', data[0]);
        
        // Update stats after successful creation
        await updateAnnouncementStats();
        
        return data[0];
        
    } catch (error) {
        console.error('Error creating announcement:', error);
        throw error; // Re-throw to be caught by sendFromPreview
    }
}

function resetForm() {
    const form = document.getElementById('announceForm');
    if (form) form.reset();
    
    // Reset character count
    const charCount = document.getElementById('charCount');
    if (charCount) {
        charCount.textContent = '0';
        charCount.style.color = '';
    }

    // Remove any error classes
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    previewData = null;
}

// =====================
// HISTORY RENDERING
// =====================
/**
Render announcement history from Supabase data
*/
function renderHistory() {
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    const historyCount = document.getElementById('historyCount');
    
    if (!historyList) return;

    // Get current data (from Supabase or localStorage)
    let announcements = window.announcements || [];

    // Apply filters
    const filterTarget = document.getElementById('filterTarget')?.value || '';
    const filterPriority = document.getElementById('filterPriority')?.value || '';
    
    let filtered = announcements.filter(item => {
        const matchesTarget = !filterTarget || item.target === filterTarget || item.target_audience === filterTarget;
        const matchesPriority = !filterPriority || item.priority === filterPriority;
        return matchesTarget && matchesPriority;
    });

    // Update count
    if (historyCount) {
        historyCount.textContent = `${filtered.length} sent`;
    }

    // Show/hide empty state
    if (filtered.length === 0) {
        if (historyEmpty) historyEmpty.style.display = 'block';
        historyList.innerHTML = '';
        return;
    }
    
    if (historyEmpty) historyEmpty.style.display = 'none';

    // Render list
    historyList.innerHTML = filtered.map(item => {
        const timestamp = item.timestamp || item.created_at || item.published_at;
        const priority = item.priority || 'normal';
        const target = item.target_audience || item.target || 'all';
        
        // Get proper priority display
        const priorityDisplay = priority.charAt(0).toUpperCase() + priority.slice(1);
        
        // Get target label
        let targetLabel = 'All Residents';
        if (target === 'boys') targetLabel = 'Boys Only';
        if (target === 'girls') targetLabel = 'Girls Only';
        
        return `
            <li class="history-item" onclick="viewAnnouncement('${item.id}')">
                <div class="history-item-header">
                    <span class="history-item-title">${escapeHtml(item.subject)}</span>
                    <div class="history-item-meta">
                        <span class="priority-badge priority-${priority}">${priorityDisplay}</span>
                        <span>${formatDateTime(timestamp)}</span>
                    </div>
                </div>
                <div class="history-item-meta" style="margin-bottom:8px">
                    <span class="badge" style="background:#e0f2fe;color:#0284c7">${escapeHtml(targetLabel)}</span>
                </div>
                <p class="history-item-message">${escapeHtml(item.message)}</p>
                <div class="history-item-actions">
                    <button class="btn btn-sm btn-view" onclick="event.stopPropagation(); viewAnnouncement('${item.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="event.stopPropagation(); deleteAnnouncement('${item.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </li>
        `;
    }).join('');
}

function viewAnnouncement(id) {
    const announcement = announcements.find(a => a.id == id || a.id === parseInt(id));
    if (!announcement) return;

    document.getElementById('detailSubject').textContent = announcement.subject;
    document.getElementById('detailTarget').textContent = announcement.targetLabel || announcement.target_audience || announcement.target;
    document.getElementById('detailPriority').innerHTML = `
        <span class="priority-badge priority-${announcement.priority || 'normal'}">
            ${announcement.priority ? announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1) : 'Normal'}
        </span>
    `;
    document.getElementById('detailTime').textContent = formatDateTime(announcement.timestamp || announcement.published_at);
    document.getElementById('detailMessage').textContent = announcement.message;

    document.getElementById('viewModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
}

/**
Delete announcement from Supabase (with localStorage fallback)
*/
async function deleteAnnouncement(id) {
    try {
        // Try Supabase first
        const { error } = await window.supabaseClient
            .from('announcements')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // Refresh from Supabase
        await loadAnnouncements();
        showSuccessToast('✓ Deleted', 'Announcement removed permanently');
        
    } catch (err) {
        console.warn('⚠️ Falling back to localStorage for delete');
        // Fallback: Remove from localStorage array
        window.announcements = (window.announcements || []).filter(a => a.id != id && a.id !== parseInt(id));
        try {
            localStorage.setItem('smartdormx_announcements', JSON.stringify(window.announcements));
            renderHistory();
            updateStats();
            showSuccessToast('✓ Deleted (Local)', 'Announcement removed from local storage');
        } catch (e) {
            showErrorToast('Error', 'Failed to delete announcement');
        }
    }
}

/**
🔥 FIXED: Clear All - Delete ALL announcements from Supabase
*/
async function confirmClearHistory() {
    const count = window.announcements.length;
    
    if (count === 0) {
        showWarningToast('No Announcements', 'No announcements to clear');
        return;
    }

    showConfirm(
        'Clear All History?',
        `Are you sure you want to delete <strong>all ${count} announcements</strong>?<br><br><strong>⚠️ This will permanently delete them from the database and cannot be undone.</strong>`,
        async () => {
            try {
                // Delete ALL announcements from Supabase
                const { error } = await window.supabaseClient
                    .from('announcements')
                    .delete()
                    .neq('id', 0); // This deletes all records
                
                if (error) throw error;
                
                // Clear local state
                window.announcements = [];
                
                // Update UI
                renderHistory();
                updateStats();
                await updateAnnouncementStats();
                
                showSuccessToast('✓ Cleared', `All ${count} announcements deleted permanently`);
                
            } catch (err) {
                console.error('Error clearing announcements:', err);
                
                // Fallback: Clear localStorage only
                window.announcements = [];
                localStorage.setItem('smartdormx_announcements', JSON.stringify([]));
                renderHistory();
                updateStats();
                
                showErrorToast('Warning', 'Failed to delete from database. Only local data cleared.');
            }
        },
        'Delete All',
        true
    );
}

// =====================
// CONFIRM MODAL
// =====================
function showConfirm(title, message, callback, buttonText = 'Confirm', isDestructive = false) {
    confirmCallback = callback;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').innerHTML = message;
    document.getElementById('confirmIcon').textContent = '⚠️';

    const confirmBtn = document.getElementById('confirmYesBtn');
    confirmBtn.textContent = buttonText;
    confirmBtn.className = isDestructive ? 'btn btn-danger' : 'btn btn-primary';

    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirm() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

function executeConfirm() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirm();
}

// =====================
// UTILITY FUNCTIONS
// =====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Close modals when clicking on overlay
function closeModalOnOverlay(event, modalId) {
    if (event.target.id === modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            if (modalId === 'previewModal') previewData = null;
            if (modalId === 'confirmModal') confirmCallback = null;
        }
    }
}

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePreview();
        closeViewModal();
        closeConfirm();
    }
});

// Logout function
function confirmLogout(event) {
    event.preventDefault();
    showConfirm(
        'Logout?',
        'Are you sure you want to logout?',
        () => {
            localStorage.clear();
            window.location.href = 'sign-in.html';
        },
        'Logout',
        false
    );
}

// Navigation helper
if (typeof navigateTo !== 'function') {
    window.navigateTo = function(page) {
        window.location.href = page;
    };
}