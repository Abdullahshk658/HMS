/* ========================================
   SmartDormX - Header & Sidebar Logic
   File: top-header.js
   ======================================== */

// Toggle Sidebar (Open/Close)
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
  
  // Close profile dropdown if open
  closeProfileDropdown();
}

// Toggle Profile Dropdown
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  const wrapper = document.querySelector('.profile-wrapper');
  const arrow = document.getElementById('profileArrow');
  
  const isOpen = dropdown.classList.contains('show');
  
  dropdown.classList.toggle('show');
  wrapper.classList.toggle('open');
  wrapper.setAttribute('aria-expanded', !isOpen);
  
  // Rotate arrow icon
  if (arrow) {
      arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  }
  
  // Close sidebar if open
  closeSidebar();
}

// Close Sidebar
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

// Close Profile Dropdown
function closeProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  const wrapper = document.querySelector('.profile-wrapper');
  const arrow = document.getElementById('profileArrow');
  
  dropdown.classList.remove('show');
  wrapper.classList.remove('open');
  wrapper.setAttribute('aria-expanded', 'false');
  
  if (arrow) {
      arrow.style.transform = 'rotate(0deg)';
  }
}

// Handle Logout
function handleLogout(event) {
  event.preventDefault();
  if (confirm('Are you sure you want to logout?')) {
      // Clear any auth tokens/session here
      window.location.href = 'sign-in.html';
  }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
  const profileWrapper = document.querySelector('.profile-wrapper');
  const profileDropdown = document.getElementById('profileDropdown');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuToggle = document.getElementById('menuToggle');
  
  // Close profile dropdown if clicked outside
  if (!profileWrapper.contains(event.target) && profileDropdown.classList.contains('show')) {
      closeProfileDropdown();
  }
  
  // Close sidebar if clicked on overlay (not on sidebar or toggle)
  if (sidebar.classList.contains('open') && 
      !sidebar.contains(event.target) && 
      !menuToggle.contains(event.target)) {
      closeSidebar();
  }
});

// Keyboard accessibility for profile
document.querySelector('.profile-wrapper').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleProfileDropdown();
  }
});

// Keyboard accessibility for sidebar toggle
document.getElementById('menuToggle').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSidebar();
  }
});

// Initialize: Ensure dropdowns are closed on load
document.addEventListener('DOMContentLoaded', function() {
  closeProfileDropdown();
  closeSidebar();
});