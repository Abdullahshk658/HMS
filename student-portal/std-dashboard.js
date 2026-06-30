/**
 * SmartDormX - Student Dashboard
 * Production Ready with LocalStorage Backend
 */

// ═══════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════

const toastContainer = document.getElementById('toastContainer');
const toastConfig = {
  duration: 3000,
  maxToasts: 3
};

const toastIcons = {
  success: '<i class="fas fa-check-circle"></i>',
  error: '<i class="fas fa-exclamation-circle"></i>',
  warning: '<i class="fas fa-exclamation-triangle"></i>',
  info: '<i class="fas fa-info-circle"></i>'
};

function showToast({ type = 'info', title = '', message = '', duration = toastConfig.duration } = {}) {
  if (!toastContainer) return null;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  
  toast.innerHTML = `
    <div class="toast-icon">${toastIcons[type] || toastIcons.info}</div>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
      ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast-close" onclick="closeToast(this)" aria-label="Close notification">
      <i class="fas fa-times"></i>
    </button>
    <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Trigger reflow
  void toast.offsetWidth;
  
  // Show toast
  toast.classList.add('toast-show');
  
  // Auto close
  const timeoutId = setTimeout(() => closeToast(toast), duration);
  toast.dataset.timeoutId = timeoutId;
  
  // Limit number of toasts
  const allToasts = toastContainer.querySelectorAll('.toast:not(.hiding)');
  if (allToasts.length > toastConfig.maxToasts) {
    closeToast(allToasts[0]);
  }
  
  return toast;
}

function closeToast(element) {
  const toast = element.classList?.contains('toast') ? element : element.closest?.('.toast');
  if (!toast) return;
  
  // Clear timeout
  if (toast.dataset.timeoutId) {
    clearTimeout(parseInt(toast.dataset.timeoutId));
  }
  
  // Add hiding class
  toast.classList.add('hiding');
  
  // Remove after animation
  const onEnd = () => {
    toast.removeEventListener('animationend', onEnd);
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  };
  
  toast.addEventListener('animationend', onEnd);
  
  // Fallback removal
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 400);
}

// Convenience functions
const showSuccess = (title, message) => showToast({ type: 'success', title, message });
const showError = (title, message) => showToast({ type: 'error', title, message });
const showWarning = (title, message) => showToast({ type: 'warning', title, message });
const showInfo = (title, message) => showToast({ type: 'info', title, message });

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════
// LOCALSTORAGE BACKEND
// ═══════════════════════════════════════════

const StorageKeys = {
  STUDENT_PROFILE: 'smartdorm_student_profile',
  MEAL_PREFERENCES: 'smartdorm_meal_preferences',
  FRESH_LOGIN: 'smartdorm_fresh_login'
};

// Initialize default profile
const defaultProfile = {
  fullName: 'Fahad Ali',
  regNo: 'B22F0403CS046',
  email: 'fahad.ali@student.fh.de',
  verified: true,
  hostelUnit: 'C',
  roomNumber: 'CF-225',
  attendance: 92,
  accountStatus: 'Active'
};

// Storage utilities
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
    if (!this.get(StorageKeys.STUDENT_PROFILE)) {
      this.set(StorageKeys.STUDENT_PROFILE, defaultProfile);
    }
  }
};

// Initialize storage
Storage.initialize();

// ═══════════════════════════════════════════
// PROFILE DATA SYNC
// ═══════════════════════════════════════════

function syncProfileData() {
  try {
    const profile = Storage.get(StorageKeys.STUDENT_PROFILE);
    if (!profile) return;
    
    // Update header name
    const headerName = document.getElementById('headerName');
    if (headerName) {
      headerName.textContent = profile.fullName;
    }
    
    // Update dashboard welcome
    const dashboardName = document.getElementById('dashboardName');
    if (dashboardName) {
      dashboardName.textContent = `Welcome, ${profile.fullName.split(' ')[0]}`;
    }
    
    // Update avatar initials
    const initials = profile.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const avatar = document.getElementById('headerAvatar');
    if (avatar) {
      avatar.textContent = initials;
    }
    
    // Update metrics
    if (profile.hostelUnit) {
      document.getElementById('hostelUnit').textContent = profile.hostelUnit;
    }
    
    if (profile.roomNumber) {
      document.getElementById('roomNumber').textContent = profile.roomNumber;
    }
    
    if (profile.attendance) {
      document.getElementById('attendancePercent').textContent = `${profile.attendance}%`;
    }
    
    // Show verified badge if verified
    if (profile.verified) {
      document.getElementById('verifiedBadge').classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Profile sync failed:', error);
  }
}

// Listen for storage changes
window.addEventListener('storage', (e) => {
  if (e.key === StorageKeys.STUDENT_PROFILE) {
    syncProfileData();
  }
});

// ═══════════════════════════════════════════
// MEAL ATTENDANCE TOGGLES
// ═══════════════════════════════════════════

function initializeMealToggles() {
  const toggleGroups = document.querySelectorAll('.toggle-group');
  
  toggleGroups.forEach(group => {
    const buttons = group.querySelectorAll('.toggle-btn');
    const mealRow = group.closest('.meal-row');
    const mealName = mealRow?.querySelector('.meal-info span')?.textContent?.split('(')[0]?.trim() || 'Meal';
    
    buttons.forEach(btn => {
      // Set data attributes if not already set
      if (!btn.dataset.meal) {
        btn.dataset.meal = mealName.toLowerCase().replace(/\s+/g, '');
      }
      if (!btn.dataset.status) {
        btn.dataset.status = btn.textContent.trim().toLowerCase();
      }
      
      btn.addEventListener('click', function() {
        // Remove active class from all buttons in group
        buttons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        
        // Add active class to clicked button
        this.classList.add('active');
        this.setAttribute('aria-pressed', 'true');
        
        const meal = formatMeal(this.dataset.meal);
        const status = this.dataset.status;
        
        // Show toast notification
        if (status === 'coming') {
          showSuccess(`${meal} ✓`, `You're attending ${meal.toLowerCase()}`);
        } else {
          showWarning(`${meal} ⊘`, `You're skipping ${meal.toLowerCase()}`);
        }
        
        // Save preference to localStorage
        saveMealPreference(this.dataset.meal, status);
        
        console.log(`✓ ${this.dataset.meal}: ${this.dataset.status}`);
      });
    });
  });
  
  // Load saved preferences
  loadMealPreferences();
}

function saveMealPreference(meal, status) {
  const preferences = Storage.get(StorageKeys.MEAL_PREFERENCES) || {};
  preferences[meal] = status;
  Storage.set(StorageKeys.MEAL_PREFERENCES, preferences);
}

function loadMealPreferences() {
  const preferences = Storage.get(StorageKeys.MEAL_PREFERENCES) || {};
  
  Object.entries(preferences).forEach(([meal, status]) => {
    const button = document.querySelector(`.toggle-btn[data-meal="${meal}"][data-status="${status}"]`);
    if (button) {
      // Remove active from siblings
      const group = button.closest('.toggle-group');
      group.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      });
      
      // Set this button as active
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
    }
  });
}

function formatMeal(meal) {
  const map = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner'
  };
  return map[meal.toLowerCase()] || meal.charAt(0).toUpperCase() + meal.slice(1);
}

// ═══════════════════════════════════════════
// CHART CONFIGURATION
// ═══════════════════════════════════════════

let usageChart = null;

const chartData = {
  lastMonth: {
    // April data (Previous Month)
    labels: ['Apr 1', 'Apr 3', 'Apr 5', 'Apr 8', 'Apr 10', 'Apr 12', 'Apr 15', 'Apr 17', 'Apr 20', 'Apr 22', 'Apr 25', 'Apr 28', 'Apr 30'],
    data: [3, 2, 3, 3, 2, 3, 1, 3, 2, 3, 3, 2, 3],
    yMax: 4,
    yLabel: 'Meals per Day',
    yFormat: v => ['None', '1', '2', '3', 'Full'][v] || v
  },
  lastSemester: {
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    data: [82, 78, 85, 88, 90, 92],
    yMax: 100,
    yLabel: 'Attendance %',
    yFormat: v => `${v}%`
  }
};

function initializeChart() {
  const ctx = document.getElementById('usageGraph');
  if (!ctx) return;
  
  // Destroy existing chart
  if (usageChart) {
    usageChart.destroy();
  }
  
  // Default to lastMonth (April)
  const data = chartData.lastMonth;
  
  usageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Attendance',
        data: data.data,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#4f46e5',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#4f46e5',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          titleFont: {
            size: 13,
            weight: '600'
          },
          bodyFont: {
            size: 12
          },
          callbacks: {
            label: (context) => data.yFormat(context.parsed.y)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: data.yMax,
          ticks: {
            stepSize: data.yMax === 4 ? 1 : 20,
            color: '#6b7280',
            font: {
              size: 11
            },
            callback: (value) => data.yFormat(value)
          },
          grid: {
            color: '#f3f4f6',
            drawBorder: false
          },
          title: {
            display: true,
            text: data.yLabel,
            color: '#6b7280',
            font: {
              size: 11,
              weight: '500'
            }
          }
        },
        x: {
          ticks: {
            color: '#6b7280',
            font: {
              size: 10
            }
          },
          grid: {
            display: false,
            drawBorder: false
          }
        }
      }
    }
  });
}

function updateChart(period) {
  if (!usageChart || !chartData[period]) return;
  
  const data = chartData[period];
  
  // Update chart data
  usageChart.data.labels = data.labels;
  usageChart.data.datasets[0].data = data.data;
  usageChart.options.scales.y.max = data.yMax;
  usageChart.options.scales.y.ticks.stepSize = data.yMax === 4 ? 1 : 20;
  usageChart.options.scales.y.ticks.callback = (v) => data.yFormat(v);
  usageChart.options.scales.y.title.text = data.yLabel;
  usageChart.options.plugins.tooltip.callbacks.label = (ctx) => data.yFormat(ctx.parsed.y);
  
  // Update buttons
  document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById(period === 'lastMonth' ? 'btnLastMonth' : 'btnLastSemester');
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  usageChart.update('active');
  
  // Show info toast
  const labels = {
    lastMonth: 'April',
    lastSemester: 'Last Semester'
  };
  
  showInfo('Chart Updated', `Showing ${labels[period] || period} data`);
}

// ═══════════════════════════════════════════
// WELCOME TOAST (Login Only)
// ═══════════════════════════════════════════

function shouldShowWelcomeToast() {
  const freshLogin = sessionStorage.getItem(StorageKeys.FRESH_LOGIN);
  if (freshLogin === 'true') {
    sessionStorage.removeItem(StorageKeys.FRESH_LOGIN);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Sync profile data
  syncProfileData();
  
  // Initialize meal toggles
  initializeMealToggles();
  
  // Initialize chart
  initializeChart();
  
  // Show welcome toast on fresh login
  if (shouldShowWelcomeToast()) {
    setTimeout(() => {
      showInfo('Welcome to SmartDormX', 'Your dashboard is ready to use');
    }, 500);
  }
  
  console.log('✅ SmartDormX Dashboard Loaded - Production Ready');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('active') && typeof toggleSidebar === 'function') {
      toggleSidebar();
    }
    
    // Close all toasts
    document.querySelectorAll('.toast').forEach(toast => closeToast(toast));
  }
});

// Handle window resize for chart
window.addEventListener('resize', () => {
  if (usageChart) {
    usageChart.resize();
  }
});

// Expose functions globally
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showToast = showToast;
window.closeToast = closeToast;
window.updateChart = updateChart;
window.syncProfileData = syncProfileData;