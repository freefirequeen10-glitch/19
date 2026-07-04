// admin.js

// Global Side Panel drawer controller
window.toggleSidebar = function(open) {
  const sidebar = document.getElementById('mobile-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (!sidebar || !overlay) return;
  
  if (open) {
    sidebar.classList.add('sidebar-open');
    overlay.classList.add('overlay-open');
  } else {
    sidebar.classList.remove('sidebar-open');
    overlay.classList.remove('overlay-open');
  }
};

// Toggle Sidebar Match Manager Collapse Status
window.toggleSidebarMatches = function() {
  const subMenus = document.querySelectorAll('.sidebar-matches-sub');
  const arrows = document.querySelectorAll('.sidebar-matches-arrow');
  
  subMenus.forEach(subMenu => {
    subMenu.classList.toggle('hidden');
  });
  
  arrows.forEach(arrow => {
    arrow.classList.toggle('rotate-180');
  });
};

// Route & Switch inside Match Manager view
window.switchMatchManagerView = function(mode, btnEl) {
  // Transfer main panel visibility to Match Manager
  window.switchAdminView('matches', btnEl);
  
  // Call internal Match Manager sub-route selection
  if (typeof window.setMatchManagerMode === 'function') {
    window.setMatchManagerMode(mode);
  }
};

// Global view/panel switching logic
window.switchAdminView = function(viewId, btnEl) {
  // Hide all panels
  document.querySelectorAll('.adm-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  // Reveal targeted panel
  const activePanel = document.getElementById('adm-view-' + viewId);
  if (activePanel) {
    activePanel.classList.remove('hidden');
  }
  
  // Toggle navigation button styles (Desktop)
  document.querySelectorAll('#desktop-sidebar .admin-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Toggle navigation button styles (Mobile Drawer)
  document.querySelectorAll('#mobile-sidebar .admin-nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Find and activate the clicked navigation buttons across both desktop and mobile lists
  if (btnEl) {
    btnEl.classList.add('active');
    
    // Find matching navigation buttons by checking their onclick attribute or text to sync active state
    const actionAttr = btnEl.getAttribute('onclick');
    if (actionAttr) {
      document.querySelectorAll(`.admin-nav-btn[onclick="${actionAttr}"]`).forEach(syncBtn => {
        syncBtn.classList.add('active');
      });
    }
  }

  // Dismiss mobile drawer automatically
  window.toggleSidebar(false);
};

// Structural listener binding
document.addEventListener('DOMContentLoaded', () => {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const desktopLinks = document.getElementById('desktop-nav-links');
  const mobileLinks = document.getElementById('mobile-nav-links');

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => window.toggleSidebar(true));
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => window.toggleSidebar(false));
  }

  // Sync mobile drawer navigation buttons with desktop structure dynamically
  if (desktopLinks && mobileLinks) {
    mobileLinks.innerHTML = desktopLinks.innerHTML;
  }
});