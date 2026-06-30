/**
 * SmartDormX - Admin Dashboard JavaScript
 * File: dashboard.js
 * Version: 2.0.0 (localStorage Backend)
 * 
 * Features:
 * ✓ Chart.js distribution chart (doughnut)
 * ✓ Alerts system with localStorage persistence
 * ✓ Stats loading & animation from localStorage
 * ✓ Quick actions navigation
 * ✓ Responsive chart legend
 * ✓ Full localStorage backend with error handling
 * ✓ XSS protection with escapeHtml()
 * ✓ Backend-ready utility functions
 */
// 🔒 AUTH GUARD (redirect if not logged in)
window.addEventListener("DOMContentLoaded", async () => {
  const { data } = await window.supabaseClient.auth.getSession();

  if (!data.session) {
    window.location.href = "login.html";
  }
});
async function logout() {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
// ================================
// STORAGE CONFIGURATION
// ================================
const STORAGE = {
    PREFIX: 'smartdormx_',
    KEYS: {
        CHART_DATA: 'smartdormx_chartData',
        ALERTS: 'smartdormx_alerts',
        STATS: 'smartdormx_stats',
        INITIALIZED: 'smartdormx_initialized'
    },
    VERSION: '2.0.0'
};

// ================================
// GLOBAL VARIABLES
// ================================
let distChart = null;
let isInitialized = false;

const CHART_COLORS = {
    hostel: ['#4f46e5', '#7c3aed', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'],
    program: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']
};

// Default chart data (used on first load only)
const DEFAULT_CHART_DATA = {
    hostel: { 
        labels: ['Hostel A', 'Hostel B', 'Hostel C', 'Railway', 'School', 'Hostel D'], 
        values: [85, 62, 54, 48, 38, 25] 
    },
    program: { 
        labels: ['Engineering', 'Business', 'Arts', 'Science', 'Medical', 'IT'], 
        values: [95, 72, 48, 42, 30, 28] 
    }
};

// Default alerts (used on first load only)
const DEFAULT_ALERTS = [
    { 
        id: generateAlertId(), 
        type: 'urgent', 
        icon: 'fa-triangle-exclamation', 
        title: 'Unknown Entry Detected', 
        message: 'Unregistered person at Hostel B main gate', 
        location: 'Hostel B - Main Gate', 
        time: formatDate(new Date(Date.now() - 15 * 60 * 1000)),
        read: false 
    },
    { 
        id: generateAlertId(), 
        type: 'warning', 
        icon: 'fa-door-open', 
        title: 'Gate Left Open', 
        message: 'Main entrance gate open for more than 10 minutes', 
        location: 'Hostel A - Entrance', 
        time: formatDate(new Date(Date.now() - 60 * 60 * 1000)),
        read: false 
    },
    { 
        id: generateAlertId(), 
        type: 'info', 
        icon: 'fa-user-plus', 
        title: 'New Student Registered', 
        message: 'Ali Raza has been assigned to Room 304', 
        location: 'Railway Hostel - Room 304', 
        time: formatDate(new Date(Date.now() - 3 * 60 * 60 * 1000)),
        read: true 
    },
    { 
        id: generateAlertId(), 
        type: 'success', 
        icon: 'fa-check-circle', 
        title: 'Monthly Inspection Complete', 
        message: 'Safety check cleared for all blocks', 
        location: 'All Hostels', 
        time: formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        read: true 
    }
];

// Default stats (used on first load only)
const DEFAULT_STATS = {
    hostels: 5,
    students: 287,
    rooms: 14,
    alerts: 12,
    requests: 8,
    urgent: 3
};

// ================================
// INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SmartDormX Dashboard initializing...');
    
    // Initialize localStorage backend first
    initStorageBackend();
    
    // Then load UI components
    initChart();
    loadAlerts();
    loadStats();
    setupQuickLinks();
    setupEventListeners();
    
    isInitialized = true;
    console.log('✅ Dashboard fully initialized');
});

// ================================
// LOCAL STORAGE BACKEND
// ================================

/**
 * Initialize storage backend - loads or creates default data
 */
function initStorageBackend() {
    try {
        const initialized = localStorage.getItem(STORAGE.KEYS.INITIALIZED);
        
        if (initialized === STORAGE.VERSION) {
            console.log('📦 Storage already initialized, loading existing data');
            return;
        }
        
        console.log('🆕 First load - initializing storage with default data');
        
        // Save default data to localStorage
        saveChartData(DEFAULT_CHART_DATA);
        saveAlerts(DEFAULT_ALERTS);
        saveStats(DEFAULT_STATS);
        
        // Mark as initialized
        localStorage.setItem(STORAGE.KEYS.INITIALIZED, STORAGE.VERSION);
        
        console.log('💾 Default data saved to localStorage');
        
    } catch (error) {
        console.error('❌ Storage initialization failed:', error);
        // Continue with defaults in memory if storage fails
    }
}

/**
 * Safe localStorage getter with error handling
 */
function getFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`⚠️ Error reading ${key} from storage:`, error);
        return defaultValue;
    }
}

/**
 * Safe localStorage setter with error handling
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`❌ Error saving ${key} to storage:`, error);
        showToast('Storage error - changes may not persist', 'warning');
        return false;
    }
}

/**
 * Chart data storage helpers
 */
function getChartData(type) {
    const data = getFromStorage(STORAGE.KEYS.CHART_DATA, DEFAULT_CHART_DATA);
    return data[type] || data.hostel || DEFAULT_CHART_DATA.hostel;
}

function saveChartData(data) {
    return saveToStorage(STORAGE.KEYS.CHART_DATA, data);
}

/**
 * Alerts storage helpers
 */
function getAlerts() {
    return getFromStorage(STORAGE.KEYS.ALERTS, DEFAULT_ALERTS);
}

function saveAlerts(alerts) {
    // Keep only last 50 alerts to prevent storage bloat
    const limited = alerts.slice(0, 50);
    return saveToStorage(STORAGE.KEYS.ALERTS, limited);
}

/**
 * Stats storage helpers
 */
function getStats() {
    return getFromStorage(STORAGE.KEYS.STATS, DEFAULT_STATS);
}

function saveStats(stats) {
    return saveToStorage(STORAGE.KEYS.STATS, stats);
}

/**
 * Clear all dashboard data from localStorage
 */
function clearAllStorage() {
    try {
        Object.values(STORAGE.KEYS).forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Cleared: ${key}`);
        });
        console.log('✅ All storage cleared');
        return true;
    } catch (error) {
        console.error('❌ Error clearing storage:', error);
        return false;
    }
}

// ================================
// CHART.JS INITIALIZATION
// ================================
function initChart() {
    const canvas = document.getElementById('distChart');
    
    if (!canvas) {
        console.warn('⚠️ Chart canvas #distChart not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Could not get 2D context from canvas');
        return;
    }
    
    // Destroy existing chart to prevent memory leaks
    if (distChart) {
        distChart.destroy();
    }
    
    // Get data from localStorage or defaults
    const filterValue = document.getElementById('chartFilter')?.value || 'hostel';
    const chartData = getChartData(filterValue);
    const colors = CHART_COLORS[filterValue] || CHART_COLORS.hostel;
    
    // Create chart
    distChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.values,
                backgroundColor: colors,
                borderWidth: 0,
                borderColor: '#ffffff',
                spacing: 4,
                hoverOffset: 12,
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(31, 41, 55, 0.95)',
                    titleColor: '#ffffff',
                    titleFont: { size: 13, weight: '600' },
                    bodyColor: '#e5e7eb',
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} students (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Generate legend after chart is ready
    setTimeout(() => updateChartLegend(filterValue), 100);
    console.log('✅ Chart initialized');
}

/**
 * Update chart based on filter selection
 */
function updateChart(filterType) {
    if (!distChart) {
        initChart();
        return;
    }
    
    const chartData = getChartData(filterType);
    const colors = CHART_COLORS[filterType] || CHART_COLORS.hostel;
    
    // Update with animation
    distChart.data.labels = chartData.labels;
    distChart.data.datasets[0].data = chartData.values;
    distChart.data.datasets[0].backgroundColor = colors;
    distChart.update('active');
    
    updateChartLegend(filterType);
    console.log(`🔄 Chart updated: ${filterType}`);
}

/**
 * Update chart legend dynamically
 */
function updateChartLegend(type) {
    const container = document.getElementById('chartLegend');
    if (!container) return;
    
    const chartData = getChartData(type);
    const colors = CHART_COLORS[type] || CHART_COLORS.hostel;
    
    container.innerHTML = chartData.labels.map((label, index) => {
        const color = colors[index % colors.length];
        return `
            <div class="legend-item">
                <div class="legend-color" style="background: ${escapeHtml(color)}"></div>
                <span>${escapeHtml(label)}</span>
            </div>
        `;
    }).join('');
}

// ================================
// ALERTS SYSTEM
// ================================

/**
 * Load alerts from Supabase (with localStorage fallback)
 */
async function loadAlerts() {
  const container = document.getElementById('alertsList');
  if (!container) return;
  
  try {
    // Try Supabase first
    const alerts = await window.SupabaseHelpers.getRecentAlerts(4);
    
    // Render empty state
    if (!alerts || alerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-circle"></i>
          <p>All clear! No recent alerts.</p>
        </div>
      `;
      return;
    }
    
    // Show max 4 recent alerts (same rendering logic)
    container.innerHTML = alerts.map(alert => {
      const isNew = !alert.read ? `<span class="badge-new">New</span>` : '';
      return `
        <div class="alert-item ${escapeHtml(alert.type)}" 
             onclick="markAlertRead(${alert.id})" 
             tabindex="0" 
             role="button"
             aria-label="${escapeHtml(alert.title)}">
          <div class="alert-icon">
            <i class="fas ${escapeHtml(alert.icon)}"></i>
          </div>
          <div class="alert-content">
            <h4>${escapeHtml(alert.title)}</h4>
            <p>${escapeHtml(alert.message)}</p>
            <div class="alert-meta">
              <span class="alert-location">
                <i class="fas fa-location-dot"></i>
                ${escapeHtml(alert.location)}
              </span>
              <span class="alert-time">
                <i class="fas fa-clock"></i>
                ${escapeHtml(alert.time)}
              </span>
            </div>
          </div>
          ${isNew}
        </div>
      `;
    }).join('');
    
    console.log('✅ Alerts loaded from Supabase');
  } catch (err) {
    console.warn('⚠️ Falling back to localStorage for alerts');
    // Original localStorage logic as fallback
    const alerts = getAlerts();
    // ... (keep original rendering code here)
    /**
 * Load and render alerts from localStorage
 */
function loadAlerts() {
    const container = document.getElementById('alertsList');
    if (!container) return;
    
    const alerts = getAlerts();
    
    // Render empty state
    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>All clear! No recent alerts.</p>
            </div>
        `;
        return;
    }
    
    // Show max 4 recent alerts
    const recent = alerts.slice(0, 4);
    
    container.innerHTML = recent.map(alert => {
        const isNew = !alert.read ? `<span class="badge-new">New</span>` : '';
        return `
            <div class="alert-item ${escapeHtml(alert.type)}" 
                 onclick="markAlertRead(${alert.id})" 
                 tabindex="0" 
                 role="button"
                 aria-label="${escapeHtml(alert.title)}">
                <div class="alert-icon">
                    <i class="fas ${escapeHtml(alert.icon)}"></i>
                </div>
                <div class="alert-content">
                    <h4>${escapeHtml(alert.title)}</h4>
                    <p>${escapeHtml(alert.message)}</p>
                    <div class="alert-meta">
                        <span class="alert-location">
                            <i class="fas fa-location-dot"></i>
                            ${escapeHtml(alert.location)}
                        </span>
                        <span class="alert-time">
                            <i class="fas fa-clock"></i>
                            ${escapeHtml(alert.time)}
                        </span>
                    </div>
                </div>
                ${isNew}
            </div>
        `;
    }).join('');
}
  }
}


/**
 * Mark alert as read and persist to localStorage
 */
function markAlertRead(alertId) {
    const alerts = getAlerts();
    const updated = alerts.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
    );
    
    saveAlerts(updated);
    loadAlerts(); // Re-render
    console.log(`📝 Alert ${alertId} marked as read`);
}

/**
 * Add new alert and persist to localStorage
 */
function addAlert(alertData) {
    const newAlert = {
        id: generateAlertId(),
        type: 'info',
        icon: 'fa-bell',
        title: '',
        message: '',
        location: '',
        time: 'Just now',
        read: false,
        ...alertData
    };
    
    const alerts = getAlerts();
    alerts.unshift(newAlert);
    
    if (saveAlerts(alerts)) {
        loadAlerts();
        updateStatsBadge('alerts', alerts.length);
        console.log('🔔 Alert added:', newAlert.id);
        return newAlert.id;
    }
    return null;
}

/**
 * Delete alert by ID
 */
function deleteAlert(alertId) {
    const alerts = getAlerts().filter(a => a.id !== alertId);
    
    if (saveAlerts(alerts)) {
        loadAlerts();
        updateStatsBadge('alerts', alerts.length);
        console.log(`🗑️ Alert ${alertId} deleted`);
        return true;
    }
    return false;
}

// ================================
// STATS SYSTEM
// ================================

/**
 * Load stats from Supabase (with localStorage fallback)
 */
async function loadStats() {
  try {
    // Try Supabase first
    const stats = await window.SupabaseHelpers.getDashboardStats();
    
    const statMap = {
      hostels: 'statHostels',
      students: 'statStudents', 
      rooms: 'statRooms',
      alerts: 'statAlerts',
      requests: 'statRequests',
      urgent: 'statUrgent'
    };
    
    Object.entries(statMap).forEach(([key, elementId]) => {
      const element = document.getElementById(elementId);
      if (element && stats[key] !== undefined) {
        const current = parseInt(element.textContent) || 0;
        const target = parseInt(stats[key]) || 0;
        animateNumber(element, current, target, 600);
      }
    });
    
    console.log('✅ Stats loaded from Supabase');
  } catch (err) {
    console.warn('⚠️ Falling back to localStorage for stats');
    // Original localStorage logic as fallback
    const stats = getStats();
    // ... (keep original animation code here)
    /**
 * Load stats from localStorage and animate display
 */
function loadStats() {
    const stats = getStats();
    const statMap = {
        hostels: 'statHostels',
        students: 'statStudents', 
        rooms: 'statRooms',
        alerts: 'statAlerts',
        requests: 'statRequests',
        urgent: 'statUrgent'
    };
    
    Object.entries(statMap).forEach(([key, elementId]) => {
        const element = document.getElementById(elementId);
        if (element && stats[key] !== undefined) {
            const current = parseInt(element.textContent) || 0;
            const target = parseInt(stats[key]) || 0;
            animateNumber(element, current, target, 600);
        }
    });
}

/**
 * Update specific stat and persist to localStorage
 */
function updateStats(updates) {
    const current = getStats();
    const updated = { ...current, ...updates };
    
    if (saveStats(updated)) {
        loadStats(); // Re-render with animation
        console.log('📊 Stats updated:', updates);
        return true;
    }
    return false;
}
  }
}


/**
 * Update just the badge number (for alerts count)
 */
function updateStatsBadge(key, value) {
    const elementId = {
        alerts: 'statAlerts',
        urgent: 'statUrgent',
        requests: 'statRequests'
    }[key];
    
    if (elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            const current = parseInt(el.textContent) || 0;
            animateNumber(el, current, value, 400);
        }
    }
}

// ================================
// QUICK ACTIONS & EVENT LISTENERS
// ================================

function setupQuickLinks() {
    document.querySelectorAll('.quick-card').forEach(card => {
        card.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (e.ctrlKey || e.metaKey || e.shiftKey) return;
            if (href && href !== '#' && !href.startsWith('javascript')) {
                e.preventDefault();
                window.location.href = href;
            }
        });
        
        // Keyboard support
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'link');
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

function setupEventListeners() {
    // Chart filter
    const filter = document.getElementById('chartFilter');
    if (filter) {
        filter.addEventListener('change', (e) => updateChart(e.target.value));
    }
    
    // Alert click handler (delegated)
    document.addEventListener('click', function(e) {
        const alertItem = e.target.closest('.alert-item');
        if (alertItem) {
            const match = alertItem.getAttribute('onclick')?.match(/\d+/);
            if (match) markAlertRead(parseInt(match[0]));
        }
    });
    
    // Chart resize on window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (distChart) distChart.resize();
        }, 150);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + R: Refresh dashboard
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            refreshDashboard();
        }
        // Ctrl/Cmd + K: Focus search (if exists)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const search = document.querySelector('input[type="search"]');
            if (search) search.focus();
        }
    });
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Generate unique alert ID
 */
function generateAlertId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format date for display (relative time)
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Unknown';
    
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Animate number value change
 */
function animateNumber(element, start, end, duration) {
    if (!element || start === end || isNaN(start) || isNaN(end)) {
        if (element) element.textContent = end;
        return;
    }
    
    const range = end - start;
    const startTime = performance.now();
    
    function step(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
        const value = Math.round(start + (range * ease));
        
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    
    requestAnimationFrame(step);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Simple toast notification
 */
function showToast(message, type = 'info') {
    // Create or get toast container
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        padding:12px 16px;border-radius:8px;color:white;font-size:14px;
        background:${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'};
        box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:250px;animation:slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Refresh all dashboard data
 */
function refreshDashboard() {
    console.log('🔄 Refreshing dashboard...');
    
    // Visual feedback
    showToast('Refreshing data...', 'info');
    
    // Reload from localStorage
    loadStats();
    loadAlerts();
    const filter = document.getElementById('chartFilter')?.value || 'hostel';
    updateChart(filter);
    
    setTimeout(() => showToast('Dashboard refreshed!', 'success'), 500);
}

/**
 * Clear all data and reset to defaults
 */
function clearDashboardData() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL dashboard data from localStorage.\n\nThis includes:\n• All alerts\n• All stats\n• Chart configuration\n\nContinue?')) {
        return;
    }
    
    if (clearAllStorage()) {
        showToast('Data cleared. Reloading...', 'success');
        setTimeout(() => location.reload(), 1000);
    } else {
        showToast('Error clearing data', 'error');
    }
}

/**
 * Export dashboard data for backup/debugging
 */
function exportDashboardData() {
    const data = {
        version: STORAGE.VERSION,
        exportedAt: new Date().toISOString(),
        chartData: getChartData('hostel'),
        programData: getChartData('program'),
        alerts: getAlerts(),
        stats: getStats()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartdormx_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully!', 'success');
}

// ================================
// PUBLIC API (For Backend Integration)
// ================================
window.SmartDormXDashboard = {
    // Chart
    initChart,
    updateChart,
    getChart: () => distChart,
    
    // Alerts
    loadAlerts,
    markAlertRead,
    addAlert,
    deleteAlert,
    getAlerts,
    
    // Stats
    loadStats,
    updateStats,
    getStats,
    
    // Storage
    clearAllStorage,
    exportDashboardData,
    
    // Utilities
    refreshDashboard,
    clearDashboardData,
    escapeHtml,
    formatDate,
    
    // Debug
    debug: () => {
        console.group('🔍 SmartDormX Debug');
        console.log('Initialized:', isInitialized);
        console.log('Chart:', distChart ? 'Ready' : 'Not initialized');
        console.log('Storage Keys:', Object.values(STORAGE.KEYS));
        console.log('Alerts Count:', getAlerts()?.length || 0);
        console.log('Stats:', getStats());
        console.groupEnd();
    }
};

// ================================
// CONSOLE WELCOME
// ================================
console.log(`
╔══════════════════════════════════════════╗
║  🏠 SmartDormX Admin Dashboard v${STORAGE.VERSION}   ║
║  ✅ JavaScript Loaded Successfully       ║
║  📊 Chart.js: ${typeof Chart !== 'undefined' ? '✓ Ready' : '✗ Missing'}          ║
║  💾 localStorage: ${typeof localStorage !== 'undefined' ? '✓ Available' : '✗ Unavailable'}    ║
║                                          ║
║  🔧 Type 'SmartDormXDashboard' for API   ║
║  🔧 Type 'SmartDormXDashboard.debug()'   ║
╚══════════════════════════════════════════╝
`);