/* ═══════════════════════════════════════════════
   SmartDormX – Header & Sidebar Scripts
   File: header-sidebar.js
═══════════════════════════════════════════════ */

/* ── Sidebar toggle ───────────────────────────────── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  
  // Toggle active class
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  
  // Prevent body scroll when sidebar is open
  if (sidebar.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}
// Close Sidebar
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
}

/* ── Profile dropdown ─────────────────────────────── */
function toggleProfileDropdown() {
  document.getElementById('profileDropdown').classList.toggle('active');
  document.getElementById('profileArrow').classList.toggle('open');
}

/* ── Global click handler ─────────────────────────── 
   1. Closes sidebar when clicking outside of it
   2. Closes profile dropdown when clicking outside header-right
──────────────────────────────────────────────────── */
document.addEventListener('click', function (e) {

  /* Close sidebar if click is outside sidebar AND outside menu trigger button */
  const sidebar = document.getElementById('sidebar');
  const menuTrigger = document.querySelector('.menu-trigger');

  if (
    sidebar.classList.contains('active') &&
    !sidebar.contains(e.target) &&
    !menuTrigger.contains(e.target)
  ) {
    closeSidebar();
  }

  /* Close profile dropdown if click is outside header-right */
  if (!e.target.closest('.header-right')) {
    document.getElementById('profileDropdown').classList.remove('active');
    document.getElementById('profileArrow').classList.remove('open');
  }

});

/* ── Logout confirmation ──────────────────────────── */
function confirmLogout(e) {
  if (!confirm('Are you sure you want to logout?')) {
    e.preventDefault();
  }
}

/* ── Auto-highlight active nav item ──────────────────
   Reads the current page filename from the URL and
   adds the .active class to the matching nav link.
   Works automatically on every page — no manual
   class management needed.
──────────────────────────────────────────────────── */
(function () {
  const page = window.location.pathname.split('/').pop() || 'std-dashboard.html';
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(function (link) {
    if (link.getAttribute('href') === page) {
      link.classList.add('active');
    }
  });
})();