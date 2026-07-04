// users.js
import { db } from "./firebase.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export let allUsersData = [];

// Pagination state variables
export let currentPage = 1;
export let itemsPerPage = 10;

// Setup real-time listeners
export function setupUsersListener() {
  onSnapshot(collection(db, "users"), (snap) => {
    allUsersData = [];
    let totalWallet = 0;
    
    snap.forEach(d => { 
      const u = d.data(); 
      u.uid = u.uid || d.id; // Fallback bound
      allUsersData.push(u); 
      totalWallet += Number(u.wallet || u.walletBalance || 0);
    });

    // Main statistics updates
    const totalUsersEl = document.getElementById('stat-total-users');
    const totalWalletEl = document.getElementById('stat-total-wallet');
    
    if (totalUsersEl) totalUsersEl.innerText = snap.size.toLocaleString();
    if (totalWalletEl) totalWalletEl.innerText = "₹" + totalWallet.toLocaleString('en-IN');
    
    // Refresh lists preserving current paginated filter bounds
    window.filterUsers();
  });
}

// Custom UI Card directory generation loop
export function renderUsers(list) {
  const feed = document.getElementById('users-directory');
  if (!feed) return;
  feed.innerHTML = '';
  
  if (list.length === 0) {
    feed.innerHTML = `
      <div class="py-12 text-center glass-admin rounded-3xl border border-white/5">
        <i class="fa-solid fa-users-slash text-4xl text-gray-600 mb-3 block"></i>
        <span class="text-xs font-bold uppercase text-gray-500 tracking-widest">No matching users found</span>
      </div>`;
    return;
  }

  list.forEach(u => {
    const uid = u.uid;
    const isPremium = u.premium === true;
    const isVerified = u.verified === true;
    const isBanned = u.banned === true;
    const isOnline = u.status === "online" || u.online === true;
    
    const photo = u.photoURL || u.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;
    const walletBalance = Number(u.walletBalance || u.wallet || 0);
    const phone = u.phone || u.phoneNumber || "+91 9876543210";

    // Dynamic high fidelity mock stats mapping if not specifically in Firestore
    const matches = u.matches !== undefined ? u.matches : (parseInt(uid.substring(0, 4), 36) % 150 + 50);
    const wins = u.wins !== undefined ? u.wins : Math.round(matches * 0.4);
    const kills = u.kills !== undefined ? u.kills : Math.round(matches * 4.5);

    const card = document.createElement('div');
    card.className = `user-card-premium p-5 rounded-2xl flex flex-col lg:flex-row gap-5 justify-between items-center relative overflow-hidden border ${
      isBanned ? 'border-rose-950/40 bg-rose-950/10' : 'border-white/5 bg-black/40'
    }`;

    card.innerHTML = `
      <!-- Column 1: Identity Profile Card Layout -->
      <div class="flex items-center gap-4 w-full lg:w-1/3">
        <div class="relative flex-shrink-0">
          <div class="w-16 h-16 rounded-full flex items-center justify-center ${
            isPremium ? 'avatar-glow-premium' : 'avatar-glow-normal'
          }">
            <img src="${photo}" class="w-full h-full rounded-full bg-black object-cover">
          </div>
          <span class="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#050505] ${
            isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
          }"></span>
        </div>
        
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-center gap-1.5 flex-wrap">
            <h4 class="font-rajdhani font-bold text-white text-lg leading-none truncate">${u.username || 'No Name'}</h4>
            ${isVerified ? '<i class="fa-solid fa-circle-check text-emerald-400 text-xs" title="Verified Profile"></i>' : ''}
            ${isPremium ? '<span class="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[8px] font-black tracking-widest uppercase rounded flex items-center gap-0.5"><i class="fa-solid fa-crown text-[7px]"></i> PREMIUM</span>' : ''}
          </div>
          <p class="text-xs text-gray-400 font-medium truncate">${u.email || 'no-email@registered.com'}</p>
          <div class="flex items-center gap-1.5 text-[10px] font-mono font-medium text-gray-500">
            <span>BGMI UID: ${uid}</span>
            <button onclick="window.copyToClipboard('${uid}')" class="hover:text-admin-accent transition-colors">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
          <div class="text-[10px] text-gray-400 font-semibold"><i class="fa-solid fa-phone text-[9px] mr-1 text-gray-600"></i>${phone}</div>
        </div>
      </div>

      <!-- Column 2: Financial Wallet Indicator Area -->
      <div class="flex flex-col items-center lg:items-start justify-center gap-1 w-full lg:w-1/5 text-center lg:text-left">
        <span class="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Wallet Balance</span>
        <div class="flex items-center gap-2 justify-center lg:justify-start">
          <strong class="text-2xl font-bold font-rajdhani text-emerald-400 tracking-wide">₹${walletBalance.toLocaleString('en-IN')}</strong>
          <div class="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <i class="fa-solid fa-wallet text-emerald-400 text-[10px]"></i>
          </div>
        </div>
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
          isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
        } mt-1">
          <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}"></span>
          <span>${isOnline ? 'Online' : 'Offline'}</span>
        </span>
      </div>

      <!-- Column 3: Stats Grid -->
      <div class="grid grid-cols-3 gap-3 w-full lg:w-1/5 border-t border-b lg:border-t-0 lg:border-b-0 border-white/5 py-3 lg:py-0">
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
            <i class="fa-solid fa-gamepad text-[10px] text-gray-600"></i>
            <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500">Matches</span>
          </div>
          <span class="text-sm font-bold text-white font-rajdhani">${matches}</span>
        </div>
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
            <i class="fa-solid fa-trophy text-[10px] text-gray-600"></i>
            <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500">Wins</span>
          </div>
          <span class="text-sm font-bold text-white font-rajdhani">${wins}</span>
        </div>
        <div class="text-center">
          <div class="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
            <i class="fa-solid fa-skull text-[10px] text-gray-600"></i>
            <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500">Kills</span>
          </div>
          <span class="text-sm font-bold text-white font-rajdhani">${kills.toLocaleString()}</span>
        </div>
      </div>

      <!-- Column 4: Admin Action Matrix (Matching reference layout) -->
      <div class="flex flex-col gap-2 w-full lg:w-1/4">
        <div class="grid grid-cols-2 gap-2">
          <button onclick="window.openWalletModal('${uid}')" class="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 hover:border-purple-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-300 transition-all flex items-center justify-center gap-1">
            <i class="fa-solid fa-wallet text-[10px]"></i> WALLET
          </button>
          <button onclick="window.toggleVerifyUser('${uid}', ${isVerified})" class="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
            isVerified ? 'bg-amber-500/20 text-amber-300 border border-amber-500' : 'bg-transparent border border-white/10 text-gray-400 hover:border-amber-500/50 hover:text-amber-300'
          }">
            <i class="fa-solid fa-shield-halved text-[10px]"></i> BADGE
          </button>
          <button onclick="window.togglePremiumUser('${uid}', ${isPremium})" class="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
            isPremium ? 'bg-purple-900/30 text-purple-300 border border-purple-500' : 'bg-transparent border border-white/10 text-gray-400 hover:border-purple-500/50 hover:text-purple-300'
          }">
            <i class="fa-solid fa-crown text-[10px]"></i> PREMIUM
          </button>
          <button onclick="window.toggleUserBlock('${uid}', ${isBanned})" class="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
            isBanned ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:border-rose-500'
          }">
            <i class="fa-solid ${isBanned ? 'fa-lock-open' : 'fa-ban'} text-[10px]"></i> ${isBanned ? 'UNBAN' : 'BAN'}
          </button>
        </div>

        <div class="grid grid-cols-3 gap-1.5">
          <button onclick="window.showUserHistory('${uid}')" class="py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[8px] font-bold uppercase tracking-wider text-blue-300 transition-all flex items-center justify-center gap-0.5">
            <i class="fa-solid fa-clock-rotate-left text-[9px]"></i> HISTORY
          </button>
          <button onclick="window.editUserProfile('${uid}')" class="py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-[8px] font-bold uppercase tracking-wider text-indigo-300 transition-all flex items-center justify-center gap-0.5">
            <i class="fa-solid fa-user-pen text-[9px]"></i> EDIT
          </button>
          <button onclick="window.deleteUser('${uid}')" class="py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-[8px] font-bold uppercase tracking-wider text-rose-300 transition-all flex items-center justify-center gap-0.5">
            <i class="fa-solid fa-trash-can text-[9px]"></i> DELETE
          </button>
        </div>
      </div>
    `;
    feed.appendChild(card);
  });
}

// User-directory dynamic filtering engine
window.filterUsers = function() {
  const searchInput = document.getElementById('user-search');
  const tierFilter = document.getElementById('user-tier-filter');
  const verificationFilter = document.getElementById('user-verification-filter');
  const premiumFilter = document.getElementById('user-premium-filter');
  const rankFilter = document.getElementById('user-rank-filter');
  const sortBy = document.getElementById('user-sort-by');
  
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const tier = tierFilter ? tierFilter.value : 'all';
  const verification = verificationFilter ? verificationFilter.value : 'all';
  const premium = premiumFilter ? premiumFilter.value : 'all';
  const rank = rankFilter ? rankFilter.value : 'all';
  const sort = sortBy ? sortBy.value : 'recently_added';

  // Apply search filtering
  let filtered = allUsersData.filter(u => 
    u.username?.toLowerCase().includes(q) || 
    u.email?.toLowerCase().includes(q) || 
    u.uid?.toLowerCase().includes(q) ||
    u.phone?.toLowerCase().includes(q) ||
    u.phoneNumber?.toLowerCase().includes(q)
  );

  // Apply selectors
  if (tier === 'premium') {
    filtered = filtered.filter(u => u.premium === true);
  } else if (tier === 'normal') {
    filtered = filtered.filter(u => u.premium !== true);
  } else if (tier === 'banned') {
    filtered = filtered.filter(u => u.banned === true);
  } else if (tier === 'online') {
    filtered = filtered.filter(u => u.status === "online" || u.online === true);
  } else if (tier === 'offline') {
    filtered = filtered.filter(u => u.status !== "online" && u.online !== true);
  }

  if (verification === 'verified') {
    filtered = filtered.filter(u => u.verified === true);
  } else if (verification === 'unverified') {
    filtered = filtered.filter(u => u.verified !== true);
  }

  if (premium === 'premium') {
    filtered = filtered.filter(u => u.premium === true);
  } else if (premium === 'normal') {
    filtered = filtered.filter(u => u.premium !== true);
  }

  if (rank !== 'all') {
    filtered = filtered.filter(u => u.rank === rank);
  }

  // Sort logic mapping
  if (sort === 'highest_balance') {
    filtered.sort((a, b) => {
      const balA = Number(a.walletBalance || a.wallet || 0);
      const balB = Number(b.walletBalance || b.wallet || 0);
      return balB - balA;
    });
  } else if (sort === 'alphabetical') {
    filtered.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
  } else {
    // default Sort by: recently added
    filtered.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }

  // Update dynamic metric counters
  const totalBadge = document.getElementById('stat-total-users-badge');
  if (totalBadge) totalBadge.innerText = filtered.length;

  const statTotal = document.getElementById('users-stat-total');
  const statOnline = document.getElementById('users-stat-online');
  const statPremium = document.getElementById('users-stat-premium');
  const statBanned = document.getElementById('users-stat-banned');

  if (statTotal) statTotal.innerText = allUsersData.length.toLocaleString();
  if (statOnline) statOnline.innerText = allUsersData.filter(u => u.status === "online" || u.online === true).length.toLocaleString();
  if (statPremium) statPremium.innerText = allUsersData.filter(u => u.premium === true).length.toLocaleString();
  if (statBanned) statBanned.innerText = allUsersData.filter(u => u.banned === true).length.toLocaleString();

  // Handle visual pagination offsets
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  // Trigger dynamic numbers lists
  renderPaginationControls(filtered.length);

  // Slicing subsets
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const slicedList = filtered.slice(startIndex, endIndex);

  renderUsers(slicedList);
};

// Clear filters helper
window.clearUserFilters = function() {
  const searchInput = document.getElementById('user-search');
  const tierFilter = document.getElementById('user-tier-filter');
  const verificationFilter = document.getElementById('user-verification-filter');
  const premiumFilter = document.getElementById('user-premium-filter');
  const rankFilter = document.getElementById('user-rank-filter');
  const sortBy = document.getElementById('user-sort-by');

  if (searchInput) searchInput.value = '';
  if (tierFilter) tierFilter.value = 'all';
  if (verificationFilter) verificationFilter.value = 'all';
  if (premiumFilter) premiumFilter.value = 'all';
  if (rankFilter) rankFilter.value = 'all';
  if (sortBy) sortBy.value = 'recently_added';

  currentPage = 1;
  window.filterUsers();
  window.showToast("Filters completely reset.", "info");
};

// Clipboard function helper
window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    window.showToast("UID copied to clipboard!", "success");
  }).catch(() => {
    window.showToast("Copy failed.", "error");
  });
};

// User deletion helper
window.deleteUser = async function(userId) {
  if (confirm("Are you sure you want to permanently delete this user profile? This cannot be undone.")) {
    try {
      await deleteDoc(doc(db, "users", userId));
      window.showToast("User deleted successfully.", "success");
    } catch(e) {
      window.showToast("Failed to delete user: " + e.message, "error");
    }
  }
};

// Premium access configuration modifier
window.togglePremiumUser = async function(userId, isPremium) {
  try {
    const nextState = !isPremium;
    await updateDoc(doc(db, "users", userId), { 
      premium: nextState,
      updatedAt: serverTimestamp()
    });
    window.showToast(nextState ? "Premium Tier Assigned." : "Premium Tier Revoked.", "success");
  } catch(e) { 
    window.showToast("Failed to update Tier: " + e.message, "error"); 
  }
};

// Standard profile updates modifiers
window.toggleUserBlock = async function(userId, isBanned) {
  try {
    const nextState = !isBanned;
    await updateDoc(doc(db, "users", userId), { 
      banned: nextState,
      updatedAt: serverTimestamp()
    });
    window.showToast(nextState ? "User Banned Successfully" : "User Unbanned Successfully", "success");
  } catch(e) { 
    window.showToast("Error updating restriction: " + e.message, "error"); 
  }
};

window.toggleVerifyUser = async function(userId, isVerified) {
  try {
    const nextState = !isVerified;
    await updateDoc(doc(db, "users", userId), { 
      verified: nextState,
      updatedAt: serverTimestamp()
    });
    window.showToast(nextState ? "Verification Badge Added" : "Verification Badge Removed", "success");
  } catch(e) { 
    window.showToast("Error updating verification: " + e.message, "error"); 
  }
};

// Wallet Ledger Log Retrieval
window.showUserHistory = async function(userId) {
  const modal = document.getElementById('history-modal');
  const displayUid = document.getElementById('history-uid-display');
  const container = document.getElementById('history-logs-container');

  if (!modal || !displayUid || !container) return;

  displayUid.innerText = userId;
  container.innerHTML = `
    <div class="text-center py-8 text-gray-500">
      <i class="fa-solid fa-spinner fa-spin text-xl text-admin-neon mb-2"></i><br>
      Syncing records...
    </div>`;
  modal.classList.remove('opacity-0', 'pointer-events-none');

  try {
    const txnQuery = query(
      collection(db, "walletTransactions"), 
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(txnQuery);
    container.innerHTML = '';

    if (snap.empty) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-600">
          <i class="fa-solid fa-list-check text-2xl mb-2 opacity-40"></i>
          <p class="text-xs uppercase tracking-widest font-bold">No Transaction Records</p>
        </div>`;
      return;
    }

    snap.forEach(d => {
      const t = d.data();
      const logCard = document.createElement('div');
      logCard.className = "p-3.5 rounded-xl border border-white/5 bg-black/40 flex justify-between items-center";
      
      const isCredit = t.type === 'CREDIT';
      const badgeClass = isCredit ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      const amtPrefix = isCredit ? '+' : '';
      const txnTime = t.timestamp ? t.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Recent';

      logCard.innerHTML = `
        <div>
          <span class="text-xs font-bold text-white block">${t.title || 'Ledger Entry'}</span>
          <span class="text-[9px] text-gray-500 block">${txnTime}</span>
          ${t.reason ? `<span class="text-[10px] text-gray-400 block italic mt-0.5">"${t.reason}"</span>` : ''}
        </div>
        <span class="px-2.5 py-1 rounded-lg text-xs font-black border ${badgeClass}">
          ${amtPrefix}₹${Math.abs(t.amount || 0)}
        </span>
      `;
      container.appendChild(logCard);
    });
  } catch (error) {
    container.innerHTML = `<div class="text-rose-400 text-xs text-center py-8">Failed to fetch transactions: ${error.message}</div>`;
  }
};

window.closeHistoryModal = function() {
  document.getElementById('history-modal').classList.add('opacity-0', 'pointer-events-none');
};

// Profile Modification overlays
window.editUserProfile = async function(userId) {
  const modal = document.getElementById('user-edit-modal');
  if (!modal) return;

  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (snap.exists()) {
      const u = snap.data();
      document.getElementById('edit-user-id').value = userId;
      document.getElementById('edit-username').value = u.username || "";
      document.getElementById('edit-avatar').value = u.photoURL || u.profileImage || "";
      document.getElementById('edit-rank').value = u.rank || "Bronze";
      modal.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      window.showToast("User record missing.", "error");
    }
  } catch (e) {
    window.showToast("Sync Error: " + e.message, "error");
  }
};

window.closeEditModal = function() {
  const modal = document.getElementById('user-edit-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('user-edit-form').reset();
  }
};

// Edit Submission Form Listener
document.getElementById('user-edit-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = document.getElementById('edit-user-id').value;
  const username = document.getElementById('edit-username').value.trim();
  const avatar = document.getElementById('edit-avatar').value.trim();
  const rank = document.getElementById('edit-rank').value;

  try {
    await updateDoc(doc(db, "users", userId), {
      username: username,
      photoURL: avatar,
      profileImage: avatar,
      rank: rank,
      updatedAt: serverTimestamp()
    });
    window.showToast("Profile updated successfully.", "success");
    window.closeEditModal();
  } catch (err) {
    window.showToast("Update failed: " + err.message, "error");
  }
});

// Pagination footer renderer helper
function renderPaginationControls(totalItems) {
  const pageNumbersContainer = document.getElementById('page-numbers-container');
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');

  if (!pageNumbersContainer) return;
  pageNumbersContainer.innerHTML = '';

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pill = document.createElement('button');
    pill.className = `w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
      i === currentPage 
        ? 'bg-admin-neon text-white shadow-[0_0_10px_rgba(176,38,255,0.4)]' 
        : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white'
    }`;
    pill.innerText = i;
    pill.onclick = () => {
      currentPage = i;
      window.filterUsers();
    };
    pageNumbersContainer.appendChild(pill);
  }

  if (endPage < totalPages) {
    const dots = document.createElement('span');
    dots.className = "text-xs text-gray-500 px-1 font-bold select-none";
    dots.innerText = "...";
    pageNumbersContainer.appendChild(dots);

    const lastPill = document.createElement('button');
    lastPill.className = "w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white";
    lastPill.innerText = totalPages;
    lastPill.onclick = () => {
      currentPage = totalPages;
      window.filterUsers();
    };
    pageNumbersContainer.appendChild(lastPill);
  }
}

window.prevUserPage = function() {
  if (currentPage > 1) {
    currentPage--;
    window.filterUsers();
  }
};

window.nextUserPage = function() {
  const searchInput = document.getElementById('user-search');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const tierFilter = document.getElementById('user-tier-filter');
  const tier = tierFilter ? tierFilter.value : 'all';

  let filtered = allUsersData.filter(u => 
    u.username?.toLowerCase().includes(q) || 
    u.email?.toLowerCase().includes(q) || 
    u.uid?.toLowerCase().includes(q)
  );

  if (tier === 'premium') filtered = filtered.filter(u => u.premium === true);
  else if (tier === 'normal') filtered = filtered.filter(u => u.premium !== true);
  else if (tier === 'banned') filtered = filtered.filter(u => u.banned === true);
  else if (tier === 'online') filtered = filtered.filter(u => u.status === "online" || u.online === true);
  else if (tier === 'offline') filtered = filtered.filter(u => u.status !== "online" && u.online !== true);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage < totalPages) {
    currentPage++;
    window.filterUsers();
  }
};

window.setUserPerPage = function(val) {
  itemsPerPage = parseInt(val) || 10;
  currentPage = 1;
  window.filterUsers();
};

// Legacy single-prompt modification bindings preserved for strict structural compatibility
window.updateUsername = async function(userId, currentName) {
  const newName = prompt("Enter new username:", currentName);
  if(newName !== null && newName.trim() !== "" && newName !== currentName) {
    try {
      await updateDoc(doc(db, "users", userId), { 
        username: newName.trim(), 
        updatedAt: serverTimestamp() 
      });
      window.showToast("Username Updated Successfully", "success");
    } catch(e) { 
      window.showToast("Error: " + e.message, "error"); 
    }
  }
};

window.updateAvatar = async function(userId, currentUrl) {
  const newUrl = prompt("Enter new avatar URL:", currentUrl);
  if(newUrl !== null && newUrl.trim() !== "" && newUrl !== currentUrl) {
    try {
      await updateDoc(doc(db, "users", userId), { 
        photoURL: newUrl.trim(), 
        profileImage: newUrl.trim(), 
        updatedAt: serverTimestamp() 
      });
      window.showToast("Avatar Updated Successfully", "success");
    } catch(e) { 
      window.showToast("Error: " + e.message, "error"); 
    }
  }
};

window.updateRank = async function(userId, currentRank) {
  const newRank = prompt("Enter new rank (Bronze, Silver, Gold, Diamond, Conqueror):", currentRank);
  if(newRank !== null && newRank.trim() !== "" && newRank !== currentRank) {
    try {
      await updateDoc(doc(db, "users", userId), { 
        rank: newRank.trim(), 
        updatedAt: serverTimestamp() 
      });
      window.showToast("Rank Updated Successfully", "success");
    } catch(e) { 
      window.showToast("Error: " + e.message, "error"); 
    }
  }
};