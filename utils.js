// utils.js

// Dynamic Toast Notifications Engine
window.showToast = function(message, type = "info") {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  
  const colors = {
    success: "bg-black/90 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]",
    error: "bg-black/90 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
    info: "bg-black/90 border-admin-neon text-admin-neon shadow-[0_0_15px_rgba(176,38,255,0.3)]",
    warning: "bg-black/90 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
  };

  const icons = { 
    success: "fa-check", 
    error: "fa-xmark", 
    info: "fa-info", 
    warning: "fa-exclamation" 
  };

  const themeClass = colors[type] || colors.info;
  const iconClass = icons[type] || icons.info;

  toast.className = `px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 transform translate-x-12 opacity-0 border-l-4 ${themeClass} backdrop-blur-md`;
  toast.innerHTML = `
    <div class="w-8 h-8 rounded-full border border-current flex items-center justify-center flex-shrink-0">
      <i class="fa-solid ${iconClass}"></i>
    </div>
    <div class="text-xs font-bold tracking-wide">${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Transition in
  setTimeout(() => {
    toast.classList.remove('translate-x-12', 'opacity-0');
  }, 10);
  
  // Transition out and cleanup
  setTimeout(() => {
    toast.classList.add('translate-x-12', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
};

// Global screenshot/graphic preview modal controls
window.openPreview = function(url) {
  const previewImg = document.getElementById('preview-image');
  const previewModal = document.getElementById('preview-modal');
  
  if (previewImg && previewModal) {
    previewImg.src = url;
    previewModal.classList.remove('opacity-0', 'pointer-events-none');
  }
};

window.closePreview = function() {
  const previewModal = document.getElementById('preview-modal');
  if (previewModal) {
    previewModal.classList.add('opacity-0', 'pointer-events-none');
  }
};

// Reusable dynamic screen loader helper
export function toggleScreenLoader(show) {
  let loader = document.getElementById('global-screen-loader');
  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-screen-loader';
      loader.className = 'fixed inset-0 z-50 bg-[#050505]/80 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300';
      loader.innerHTML = `
        <div class="flex flex-col items-center gap-3">
          <i class="fa-solid fa-circle-notch fa-spin text-4xl text-admin-accent"></i>
          <span class="text-xs font-rajdhani font-bold uppercase tracking-widest text-gray-400">Processing Request...</span>
        </div>
      `;
      document.body.appendChild(loader);
    }
  } else {
    if (loader) {
      loader.classList.add('opacity-0');
      setTimeout(() => loader.remove(), 300);
    }
  }
}

// Utility string formatters
export function formatCurrency(amount) {
  return "₹" + Number(amount || 0).toLocaleString('en-IN');
}

export function formatDateTime(firebaseTimestamp) {
  if (!firebaseTimestamp) return 'N/A';
  return firebaseTimestamp.toDate().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}