/**
 * SmartDormX - Mess Management Page
 * Production Ready with LocalStorage Backend
 * ✅ Pay Now button links to std-fee.html
 * ✅ Toast notifications match dashboard style
 * ✅ Meal preferences persist across sessions
 * ✅ FIXED: No toast on initial page load
 * ✅ FIXED: Clear toasts before redirecting
 */

// ═══════════════════════════════════════════
// STORAGE CONFIGURATION
// ═══════════════════════════════════════════

const StorageKeys = {
  MESS_PREFS: 'sd_mess_prefs',
  MESS_PLAN: 'sd_mess_plan'
};

const defaultMessPlan = {
  planType: 'Monthly',
  monthlyFee: 4500,
  mealsPerDay: 3,
  status: 'Active',
  validTill: '2025-12-31',
  lastPayment: { amount: 4500, date: '2025-12-01' },
  nextBilling: '2026-01-01'
};

// ═══════════════════════════════════════════
// STORAGE UTILITIES
// ═══════════════════════════════════════════

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
  init() {
    if (!this.get(StorageKeys.MESS_PLAN)) {
      this.set(StorageKeys.MESS_PLAN, defaultMessPlan);
    }
  }
};

Storage.init();

// ═══════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════

const toastContainer = document.getElementById('toastContainer');
const toastConfig = { duration: 3000, maxToasts: 3 };
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
  
  // Trigger reflow for animation
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

// ✅ Clear ALL toasts immediately
function clearAllToasts() {
  if (toastContainer) {
    toastContainer.querySelectorAll('.toast').forEach(toast => {
      if (toast.dataset.timeoutId) clearTimeout(parseInt(toast.dataset.timeoutId));
      toast.remove();
    });
  }
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
// MEAL ATTENDANCE FUNCTIONS
// ═══════════════════════════════════════════

function initMealAttendance() {
  document.querySelectorAll('.attendance-row').forEach(row => {
    const comingBtn = row.querySelector('.btn-coming');
    const skipBtn = row.querySelector('.btn-skip');
    const meal = comingBtn?.dataset.meal;
    
    if (!comingBtn || !skipBtn || !meal) return;
    
    // Load saved preference
    loadMealPreference(meal, comingBtn, skipBtn);
    
    // Coming button click
    comingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update UI
      comingBtn.classList.add('active');
      skipBtn.classList.remove('active');
      row.classList.add('coming-active');
      row.classList.remove('skip-active');
      
      // Show toast notification
      const mealName = formatMeal(meal);
      showSuccess(`${mealName} ✓`, `Attending ${mealName.toLowerCase()}`);
      
      // Save preference
      saveMealPreference(meal, 'coming');
    });
    
    // Skip button click
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update UI
      skipBtn.classList.add('active');
      comingBtn.classList.remove('active');
      row.classList.add('skip-active');
      row.classList.remove('coming-active');
      
      // Show toast notification
      const mealName = formatMeal(meal);
      showWarning(`${mealName} ⊘`, `Skipping ${mealName.toLowerCase()}`);
      
      // Save preference
      saveMealPreference(meal, 'skip');
    });
  });
}

function saveMealPreference(meal, status) {
  const prefs = Storage.get(StorageKeys.MESS_PREFS) || {};
  prefs[meal] = {
    status: status,
    updatedAt: new Date().toISOString()
  };
  Storage.set(StorageKeys.MESS_PREFS, prefs);
}

function loadMealPreference(meal, comingBtn, skipBtn) {
  const prefs = Storage.get(StorageKeys.MESS_PREFS) || {};
  const pref = prefs[meal];
  
  if (pref && pref.status) {
    if (pref.status === 'coming') {
      comingBtn.classList.add('active');
      skipBtn.classList.remove('active');
      comingBtn.closest('.attendance-row')?.classList.add('coming-active');
    } else if (pref.status === 'skip') {
      skipBtn.classList.add('active');
      comingBtn.classList.remove('active');
      comingBtn.closest('.attendance-row')?.classList.add('skip-active');
    }
  }
}

function formatMeal(meal) {
  const map = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner'
  };
  return map[meal?.toLowerCase()] || meal?.charAt(0).toUpperCase() + meal?.slice(1);
}

// ═══════════════════════════════════════════
// WEEKLY MENU DATA
// ═══════════════════════════════════════════

const weeklyMenu = {
  Mon: {
    breakfast: [
      { item: 'Paratha with Aloo Bhaji', price: 80 },
      { item: 'Boiled Eggs (2)', price: 50 },
      { item: 'Tea/Coffee', price: 30 },
      { item: 'Fresh Juice', price: 60 }
    ],
    lunch: [
      { item: 'Chicken Karahi', price: 250 },
      { item: 'Daal Mash', price: 120 },
      { item: 'Naan/Roti (2)', price: 40 },
      { item: 'Salad & Raita', price: 50 }
    ],
    dinner: [
      { item: 'Beef Pulao', price: 280 },
      { item: 'Chicken Curry', price: 220 },
      { item: 'Naan (2)', price: 40 },
      { item: 'Fresh Salad', price: 40 }
    ]
  },
  Tue: {
    breakfast: [
      { item: 'Halwa Puri', price: 120 },
      { item: 'Channa', price: 80 },
      { item: 'Tea', price: 30 },
      { item: 'Yogurt', price: 40 }
    ],
    lunch: [
      { item: 'Chicken Biryani', price: 220 },
      { item: 'Raita', price: 40 },
      { item: 'Salad', price: 30 },
      { item: 'Papad', price: 20 }
    ],
    dinner: [
      { item: 'Daal Chawal', price: 150 },
      { item: 'Aloo Gosht', price: 200 },
      { item: 'Roti (2)', price: 30 },
      { item: 'Pickle', price: 15 }
    ]
  },
  Wed: {
    breakfast: [
      { item: 'Omelette (3 eggs)', price: 90 },
      { item: 'Bread Toast', price: 50 },
      { item: 'Tea', price: 30 },
      { item: 'Fresh Juice', price: 60 }
    ],
    lunch: [
      { item: 'Chicken Tikka', price: 280 },
      { item: 'Naan (2)', price: 40 },
      { item: 'Daal', price: 100 },
      { item: 'Salad', price: 30 }
    ],
    dinner: [
      { item: 'Mutton Korma', price: 320 },
      { item: 'Roti (2)', price: 30 },
      { item: 'Rice', price: 80 },
      { item: 'Raita', price: 40 }
    ]
  },
  Thu: {
    breakfast: [
      { item: 'Anda Paratha', price: 100 },
      { item: 'Yogurt', price: 40 },
      { item: 'Tea', price: 30 },
      { item: 'Fresh Fruit', price: 70 }
    ],
    lunch: [
      { item: 'Fish Fry', price: 260 },
      { item: 'Daal', price: 100 },
      { item: 'Rice', price: 80 },
      { item: 'Salad', price: 30 }
    ],
    dinner: [
      { item: 'Chicken Biryani', price: 220 },
      { item: 'Raita', price: 40 },
      { item: 'Gulab Jamun (2)', price: 60 }
    ]
  },
  Fri: {
    breakfast: [
      { item: 'Sindhi Paratha', price: 90 },
      { item: 'Chai', price: 30 },
      { item: 'Pickle', price: 15 }
    ],
    lunch: [
      { item: 'Nihari', price: 300 },
      { item: 'Naan (2)', price: 40 },
      { item: 'Salad', price: 30 },
      { item: 'Ginger & Lemon', price: 20 }
    ],
    dinner: [
      { item: 'BBQ Chicken', price: 350 },
      { item: 'Biryani', price: 220 },
      { item: 'Cold Drink', price: 50 },
      { item: 'Kheer', price: 70 }
    ]
  },
  Sat: {
    breakfast: [
      { item: 'French Toast', price: 100 },
      { item: 'Scrambled Eggs', price: 80 },
      { item: 'Tea', price: 30 }
    ],
    lunch: [
      { item: 'Chicken Qorma', price: 240 },
      { item: 'Naan (2)', price: 40 },
      { item: 'Daal', price: 100 },
      { item: 'Salad', price: 30 }
    ],
    dinner: [
      { item: 'Seekh Kabab (4)', price: 280 },
      { item: 'Roti (2)', price: 30 },
      { item: 'Daal Chawal', price: 150 },
      { item: 'Ice Cream', price: 80 }
    ]
  },
  Sun: {
    breakfast: [
      { item: 'Puri Bhaji', price: 110 },
      { item: 'Lassi', price: 60 },
      { item: 'Achar', price: 20 }
    ],
    lunch: [
      { item: 'Mutton Karahi', price: 350 },
      { item: 'Naan (2)', price: 40 },
      { item: 'Salad', price: 30 },
      { item: 'Raita', price: 40 }
    ],
    dinner: [
      { item: 'Chicken Pulao', price: 260 },
      { item: 'Raita', price: 40 },
      { item: 'Kheer', price: 70 },
      { item: 'Fruit Salad', price: 90 }
    ]
  }
};

// ═══════════════════════════════════════════
// MENU RENDERING FUNCTIONS
// ═══════════════════════════════════════════

function initWeeklyMenu() {
  const dayButtons = document.querySelectorAll('.day-btn');
  const breakfastList = document.getElementById('breakfastList');
  const lunchList = document.getElementById('lunchList');
  const dinnerList = document.getElementById('dinnerList');
  
  function renderMenu(day) {
    const menu = weeklyMenu[day];
    if (!menu) return;
    
    // Clear lists
    if (breakfastList) breakfastList.innerHTML = '';
    if (lunchList) lunchList.innerHTML = '';
    if (dinnerList) dinnerList.innerHTML = '';
    
    // Render breakfast
    if (breakfastList && menu.breakfast) {
      menu.breakfast.forEach(meal => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${escapeHtml(meal.item)}</span><span class="meal-price">Rs ${meal.price}</span>`;
        breakfastList.appendChild(li);
      });
    }
    
    // Render lunch
    if (lunchList && menu.lunch) {
      menu.lunch.forEach(meal => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${escapeHtml(meal.item)}</span><span class="meal-price">Rs ${meal.price}</span>`;
        lunchList.appendChild(li);
      });
    }
    
    // Render dinner
    if (dinnerList && menu.dinner) {
      menu.dinner.forEach(meal => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${escapeHtml(meal.item)}</span><span class="meal-price">Rs ${meal.price}</span>`;
        dinnerList.appendChild(li);
      });
    }
  }
  
  // Day button click handlers - Show toast ONLY on manual click
  dayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      dayButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Render menu for selected day
      renderMenu(btn.dataset.day);
      
      // ✅ Show info toast ONLY on manual click (not on page load)
      showInfo('Menu Updated', `Showing ${btn.dataset.day} menu`);
    });
  });
  
  // ✅ Auto-select today on load - NO TOAST
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIndex = new Date().getDay();
  const today = dayNames[todayIndex];
  const todayButton = document.querySelector(`.day-btn[data-day="${today}"]`);
  
  if (todayButton) {
    // Trigger click WITHOUT showing toast
    dayButtons.forEach(b => b.classList.remove('active'));
    todayButton.classList.add('active');
    renderMenu(todayButton.dataset.day);
    // ❌ NO showInfo() here - silent load
  } else if (dayButtons[0]) {
    // Fallback to Monday - also silent
    dayButtons.forEach(b => b.classList.remove('active'));
    dayButtons[0].classList.add('active');
    renderMenu(dayButtons[0].dataset.day);
  }
}

// ═══════════════════════════════════════════
// PAY BUTTON FUNCTIONALITY
// ═══════════════════════════════════════════

function initPayButton() {
  const payBtn = document.getElementById('payNowBtn');
  
  if (payBtn) {
    payBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // ✅ Clear ALL toasts before redirecting (fixes toast carrying over)
      clearAllToasts();
      
      // Small delay to ensure toasts are cleared
      setTimeout(() => {
        // ✅ Redirect to std-fee.html
        window.location.href = 'std-fee.html';
      }, 100);
    });
  }
}

// ═══════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Initialize features
  initMealAttendance();
  initWeeklyMenu();
  initPayButton();
  
  console.log('✅ Mess Page Loaded - Production Ready');
});

// ═══════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════

// Close toasts on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.toast').forEach(toast => closeToast(toast));
  }
});

// ✅ Clear toasts when navigating away (beforeunload)
window.addEventListener('beforeunload', () => {
  clearAllToasts();
});

// ═══════════════════════════════════════════
// GLOBAL EXPORTS
// ═══════════════════════════════════════════

window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showToast = showToast;
window.closeToast = closeToast;
window.clearAllToasts = clearAllToasts;