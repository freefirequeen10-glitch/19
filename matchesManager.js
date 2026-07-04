// matchesManager.js
import { db } from "./firebase.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  query, 
  where, 
  runTransaction, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { allUsersData } from "./users.js";
import { toggleScreenLoader } from "./utils.js";

// Module State Directory
let managerMatches = [];
let activeMatchId = null;
let activeMatchMode = 'Solo'; 
let joinedRequestsData = []; 
let joinedPlayersUnsubscribe = null;
let matchTournamentsUnsubscribe = null;

let activeMatchPerKillPrize = 0;
let activeMatchEntryFee = 0;
let activeMatchTitle = '';

// Pagination state variables
export let matchCurrentPage = 1;
export let matchItemsPerPage = 5;

// Subscribe to real-time tournaments collection
function initMatchTournaments() {
  matchTournamentsUnsubscribe = onSnapshot(collection(db, "tournaments"), (snap) => {
    managerMatches = [];
    snap.forEach(d => {
      const t = d.data();
      t.id = d.id;
      managerMatches.push(t);
    });
    
    renderMatchCards();
    
    // Sync deep-dive card values in real-time if selected
    if (activeMatchId) {
      const updatedMatch = managerMatches.find(m => m.id === activeMatchId);
      if (updatedMatch) {
        renderActiveMatchDetails(updatedMatch);
      }
    }
  });
}

// Render available tournaments in grid row
function renderMatchCards() {
  const grid = document.getElementById('match-cards-grid');
  if (!grid) return;
  
  // Filter active match types according to selected submenu tab
  const filtered = managerMatches.filter(t => (t.mode || 'Solo').toLowerCase() === activeMatchMode.toLowerCase());
  
  grid.innerHTML = '';
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-10 text-center glass-admin border border-white/5 rounded-2xl">
        <i class="fa-solid fa-folder-open text-2xl mb-2 opacity-30 text-gray-400"></i>
        <p class="text-xs font-bold uppercase tracking-widest text-gray-500">No ${activeMatchMode} Matches Available</p>
      </div>`;
    return;
  }
  
  filtered.forEach(t => {
    const slotsUsed = t.joinedCount || 0;
    const slotsTotal = t.totalSlots || 100;
    const slotsPct = Math.min(100, Math.round((slotsUsed / slotsTotal) * 100));
    
    const activeBorder = activeMatchId === t.id ? 'border-admin-neon shadow-[0_0_15px_rgba(176,38,255,0.2)]' : 'border-white/5 hover:border-admin-neon/30';
    
    const statusBadge = t.status === 'live' ? 'status-live' :
                        t.status === 'active' ? 'status-active' :
                        t.status === 'completed' ? 'status-completed' : 'status-hidden';
                        
    const statusLabel = t.status === 'live' ? 'Live' :
                        t.status === 'active' ? 'Upcoming' :
                        t.status === 'completed' ? 'Completed' : 'Hidden';
                        
    const card = document.createElement('div');
    card.className = `glass-admin p-4 rounded-2xl border transition-all cursor-pointer ${activeBorder}`;
    card.onclick = () => window.selectMatch(t.id);
    
    card.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">${t.game || 'Game'}</span>
        <span class="card-status-badge ${statusBadge} text-[8px] px-2 py-0.5">${statusLabel}</span>
      </div>
      <h5 class="font-rajdhani font-bold text-white text-sm truncate uppercase tracking-wide" title="${t.title}">${t.title}</h5>
      <div class="grid grid-cols-2 gap-2 mt-3 text-[10px] text-gray-400">
        <div><i class="fa-solid fa-map-location-dot text-gray-600 mr-1"></i> ${t.map || 'Erangel'}</div>
        <div class="text-right text-admin-accent font-bold">₹${t.entryFee || 0} Entry</div>
        <div><i class="fa-solid fa-skull text-gray-600 mr-1"></i> ₹${t.perKill || 0}/Kill</div>
        <div class="text-right text-emerald-400 font-bold">₹${t.prizePool || 0} Pool</div>
      </div>
      <div class="mt-3">
        <div class="flex justify-between text-[9px] text-gray-500 mb-1">
          <span>Slots: ${slotsUsed}/${slotsTotal}</span>
          <span>${slotsPct}%</span>
        </div>
        <div class="h-1 bg-white/5 rounded-full overflow-hidden">
          <div class="h-full bg-admin-neon" style="width: ${slotsPct}%"></div>
        </div>
      </div>
      <div class="mt-2 text-[9px] text-gray-500 text-center border-t border-white/5 pt-2">
        <i class="fa-regular fa-clock mr-1"></i> ${t.date || 'TBD'} | ${t.time || '--:--'}
      </div>
    `;
    grid.appendChild(card);
  });
}

// Global hook to transition manager modes (Solo / Duo / Squad)
window.setMatchManagerMode = function(mode) {
  activeMatchMode = mode;
  matchCurrentPage = 1;
  
  const badge = document.getElementById('match-active-mode-badge');
  if (badge) badge.innerText = mode;
  
  // Close active match view upon subnavigation transitions
  activeMatchId = null;
  document.getElementById('selected-match-control-center').classList.add('hidden');
  
  if (joinedPlayersUnsubscribe) {
     joinedPlayersUnsubscribe();
     joinedPlayersUnsubscribe = null;
  }
  
  renderMatchCards();
};

// Global hook to select a match card and bootstrap operations
window.selectMatch = function(matchId) {
  activeMatchId = matchId;
  matchCurrentPage = 1;
  
  renderMatchCards();
  
  if (joinedPlayersUnsubscribe) {
    joinedPlayersUnsubscribe();
    joinedPlayersUnsubscribe = null;
  }
  
  const activeMatch = managerMatches.find(t => t.id === matchId);
  if (!activeMatch) return;
  
  activeMatchPerKillPrize = Number(activeMatch.perKill) || 0;
  activeMatchEntryFee = Number(activeMatch.entryFee) || 0;
  activeMatchTitle = activeMatch.title || 'Tournament';

  renderActiveMatchDetails(activeMatch);
  
  // Real-time matchParticipants query setup
  const q = query(
    collection(db, "matchParticipants"),
    where("tournamentId", "==", matchId)
  );
  
  joinedPlayersUnsubscribe = onSnapshot(q, (snap) => {
    joinedRequestsData = [];
    snap.forEach(docSnap => {
      const r = docSnap.data();
      r.id = docSnap.id;
      joinedRequestsData.push(r);
    });
    
    window.filterMatchPlayers();
  }, (err) => {
    console.error("Match matchParticipants listener connection failed:", err);
  });
  
  document.getElementById('selected-match-control-center').classList.remove('hidden');
};

// Render match variables to stats bar
function renderActiveMatchDetails(match) {
  const titleEl = document.getElementById('selected-match-title');
  const statusEl = document.getElementById('selected-match-status');
  const scheduleEl = document.getElementById('selected-match-schedule');
  const mapEl = document.getElementById('stat-match-map');
  const perKillEl = document.getElementById('stat-match-per-kill');
  const prizePoolEl = document.getElementById('stat-match-prize-pool');
  
  if (titleEl) titleEl.innerText = match.title;
  
  if (statusEl) {
    statusEl.innerText = match.status;
    statusEl.className = `card-status-badge status-${match.status}`;
  }
  
  if (scheduleEl) scheduleEl.innerText = `${match.date || 'TBD'} | ${match.time || '--:--'}`;
  if (mapEl) mapEl.innerText = match.map || '--';
  if (perKillEl) perKillEl.innerText = `₹${match.perKill || 0}`;
  if (prizePoolEl) prizePoolEl.innerText = `₹${(match.prizePool || 0).toLocaleString('en-IN')}`;
}

// Compute player list under filters & search logic
function getFilteredJoinedRequests() {
  const searchInput = document.getElementById('match-player-search');
  const filterSelect = document.getElementById('match-player-filter');
  const sortSelect = document.getElementById('match-player-sort');
  
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filter = filterSelect ? filterSelect.value : 'all';
  const sort = sortSelect ? sortSelect.value : 'newest';
  
  let filtered = [...joinedRequestsData];
  
  filtered = filtered.filter(req => {
    const userDoc = allUsersData.find(u => u.uid === req.userId);
    
    const playerNameVal = userDoc?.username || req.userName || '';
    const gameNameVal = req.gameName || req.inGameName || req.ign || req.bgmiName || '';
    const gameUidVal = req.bgmiUid || req.gameUid || req.inGameUid || '';
    
    const matchSearch = 
      (userDoc?.username || '').toLowerCase().includes(q) ||
      playerNameVal.toLowerCase().includes(q) ||
      gameNameVal.toLowerCase().includes(q) ||
      gameUidVal.toLowerCase().includes(q) ||
      (req.userId || '').toLowerCase().includes(q);
      
    if (!matchSearch) return false;
    
    if (filter === 'online') {
      return userDoc?.status === 'online' || userDoc?.online === true;
    } else if (filter === 'offline') {
      return userDoc?.status !== 'online' && userDoc?.online !== true;
    } else if (filter === 'premium') {
      return userDoc?.premium === true;
    } else if (filter === 'verified') {
      return userDoc?.verified === true;
    }
    
    return true;
  });
  
  if (sort === 'oldest') {
    filtered.sort((a, b) => {
      const tA = a.timestamp?.seconds || 0;
      const tB = b.timestamp?.seconds || 0;
      return tA - tB;
    });
  } else {
    filtered.sort((a, b) => {
      const tA = a.timestamp?.seconds || 0;
      const tB = b.timestamp?.seconds || 0;
      return tB - tA;
    });
  }
  
  return filtered;
}

// Filter dynamic DOM rendering for list with split columns and custom pagination
window.filterMatchPlayers = function() {
  const displayedAll = getFilteredJoinedRequests();
  
  const tbody = document.getElementById('match-players-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (displayedAll.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">
          No matching joined players found.
        </td>
      </tr>`;
    calculateMatchStats();
    return;
  }
  
  // Apply pagination offsets
  const totalPages = Math.ceil(displayedAll.length / matchItemsPerPage) || 1;
  if (matchCurrentPage > totalPages) {
    matchCurrentPage = totalPages;
  }
  
  renderMatchPaginationControls(displayedAll.length);
  
  const startIndex = (matchCurrentPage - 1) * matchItemsPerPage;
  const endIndex = startIndex + matchItemsPerPage;
  const displayedPage = displayedAll.slice(startIndex, endIndex);
  
  displayedPage.forEach((req, idx) => {
    const userDoc = allUsersData.find(u => u.uid === req.userId);
    
    // PLAYER NAME - First try users collection username, fallback to userName from matchParticipants
    const playerName = userDoc?.username || req.userName || 'Player';
    
    // IN-GAME NAME - Fallback order: gameName, inGameName, ign, bgmiName
    const inGameName = req.gameName || req.inGameName || req.ign || req.bgmiName || 'N/A';
    
    // BGMI UID - Read bgmiUid correctly
    const bgmiUid = req.bgmiUid || req.gameUid || req.inGameUid || 'N/A';
    
    // PROFILE IMAGE - Use profileImage from users, then profilePhoto from matchParticipants, then standard avatar
    const photo = userDoc?.profileImage || userDoc?.photoURL || req.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.userId}`;
    
    const isOnline = userDoc?.status === 'online' || userDoc?.online === true;
    const isVerified = userDoc?.verified === true;
    const isPremium = userDoc?.premium === true;
    const walletBalance = Number(userDoc?.walletBalance || userDoc?.wallet || 0);
    
    const kills = req.kills !== undefined ? Number(req.kills) : 0;
    const totalReward = req.rewardAmount !== undefined ? Number(req.rewardAmount) : (kills * activeMatchPerKillPrize);
    
    const isCredited = req.rewardPaid === true;
    
    const tr = document.createElement('tr');
    tr.className = "border-b border-white/5 hover:bg-white/5 font-medium";
    
    tr.innerHTML = `
      <td class="p-3 text-center text-gray-500 font-mono text-[10px]">${startIndex + idx + 1}</td>
      <td class="p-3">
        <div class="flex items-center gap-2.5">
          <div class="relative flex-shrink-0">
            <img src="${photo}" class="w-8 h-8 rounded-full bg-black border border-white/10 object-cover">
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}"></span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1">
              <span class="text-xs font-bold text-white">${playerName}</span>
              ${isVerified ? '<i class="fa-solid fa-circle-check text-emerald-400 text-[10px]" title="Verified"></i>' : ''}
              ${isPremium ? '<i class="fa-solid fa-crown text-amber-400 text-[10px]" title="Premium"></i>' : ''}
            </div>
            <div class="text-[9px] text-gray-500 font-bold uppercase">Wallet: ₹${walletBalance}</div>
          </div>
        </div>
      </td>
      <td class="p-3">
        <span class="text-xs font-bold text-gray-300 block">${inGameName}</span>
      </td>
      <td class="p-3">
        <span class="text-xs font-mono font-bold text-gray-300 block">${bgmiUid}</span>
      </td>
      <td class="p-3 font-mono text-[10px] text-gray-500">
        <div class="flex items-center gap-1">
          <span class="truncate max-w-[100px]">${req.userId}</span>
          <button onclick="window.copyToClipboard('${req.userId}')" class="hover:text-admin-accent transition-colors">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      </td>
      <td class="p-3 text-center">
        <input type="number" min="0" value="${kills}" ${isCredited ? 'disabled' : ''} 
               oninput="window.updateKillsLocal('${req.id}', this.value)" 
               class="w-14 bg-black/60 border border-white/10 text-center py-1 rounded-lg text-xs font-bold focus:border-admin-neon focus:outline-none disabled:opacity-40 disabled:border-transparent">
      </td>
      <td class="p-3 text-center text-gray-400 font-mono text-[10px]">₹${activeMatchPerKillPrize}</td>
      <td class="p-3 text-center text-emerald-400 font-bold font-rajdhani text-sm" id="reward-val-${req.id}">₹${totalReward}</td>
      <td class="p-3 text-right">
        ${isCredited 
          ? `<span class="text-[9px] text-gray-500 uppercase font-bold tracking-widest"><i class="fa-solid fa-check mr-1 text-emerald-500"></i> Paid</span>` 
          : `<button onclick="window.creditPlayerReward('${req.id}')" class="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"><i class="fa-solid fa-wallet"></i> Credit</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  calculateMatchStats();
};

// Joined Match Players pagination controllers rendering
function renderMatchPaginationControls(totalItems) {
  const container = document.getElementById('match-page-numbers-container');
  const prevBtn = document.getElementById('btn-match-prev-page');
  const nextBtn = document.getElementById('btn-match-next-page');

  if (!container) return;
  container.innerHTML = '';

  const totalPages = Math.ceil(totalItems / matchItemsPerPage) || 1;

  if (prevBtn) prevBtn.disabled = matchCurrentPage === 1;
  if (nextBtn) nextBtn.disabled = matchCurrentPage === totalPages;

  let startPage = Math.max(1, matchCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pill = document.createElement('button');
    pill.className = `w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
      i === matchCurrentPage 
        ? 'bg-admin-neon text-white shadow-[0_0_10px_rgba(176,38,255,0.4)]' 
        : 'bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white'
    }`;
    pill.innerText = i;
    pill.onclick = () => {
      matchCurrentPage = i;
      window.filterMatchPlayers();
    };
    container.appendChild(pill);
  }

  if (endPage < totalPages) {
    const dots = document.createElement('span');
    dots.className = "text-xs text-gray-500 px-1 font-bold select-none";
    dots.innerText = "...";
    container.appendChild(dots);

    const lastPill = document.createElement('button');
    lastPill.className = "w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white";
    lastPill.innerText = totalPages;
    lastPill.onclick = () => {
      matchCurrentPage = totalPages;
      window.filterMatchPlayers();
    };
    container.appendChild(lastPill);
  }
}

window.prevMatchPage = function() {
  if (matchCurrentPage > 1) {
    matchCurrentPage--;
    window.filterMatchPlayers();
  }
};

window.nextMatchPage = function() {
  const displayedAll = getFilteredJoinedRequests();
  const totalPages = Math.ceil(displayedAll.length / matchItemsPerPage) || 1;
  if (matchCurrentPage < totalPages) {
    matchCurrentPage++;
    window.filterMatchPlayers();
  }
};

// Live visual calculation of kill inputs
window.updateKillsLocal = function(reqId, val) {
  const numKills = Math.max(0, parseInt(val) || 0);
  const req = joinedRequestsData.find(r => r.id === reqId);
  if (!req) return;
  
  req.kills = numKills;
  req.rewardAmount = numKills * activeMatchPerKillPrize;
  
  const rewardTextEl = document.getElementById(`reward-val-${reqId}`);
  if (rewardTextEl) {
    rewardTextEl.innerText = `₹${req.rewardAmount}`;
  }
  
  calculateMatchStats();
};

// Calculate statistical variables
function calculateMatchStats() {
  const totalJoinedCount = joinedRequestsData.length;
  const displayedPlayers = getFilteredJoinedRequests();
  
  const totalKills = joinedRequestsData.reduce((sum, r) => sum + (Number(r.kills) || 0), 0);
  const totalRewards = joinedRequestsData.reduce((sum, r) => sum + (Number(r.rewardAmount) || 0), 0);
  const entryCollection = totalJoinedCount * activeMatchEntryFee;
  
  const totalKillsEl = document.getElementById('stat-match-total-kills');
  const totalRewardsEl = document.getElementById('stat-match-total-rewards');
  const entryCollectionEl = document.getElementById('stat-match-entry-collection');
  const countPlayersEl = document.getElementById('count-match-players');
  const totalPlayersEl = document.getElementById('stat-match-players');
  
  if (totalKillsEl) totalKillsEl.innerText = totalKills;
  if (totalRewardsEl) totalRewardsEl.innerText = `₹${totalRewards.toLocaleString('en-IN')}`;
  if (entryCollectionEl) entryCollectionEl.innerText = `₹${entryCollection.toLocaleString('en-IN')}`;
  if (countPlayersEl) countPlayersEl.innerText = displayedPlayers.length;
  if (totalPlayersEl) totalPlayersEl.innerText = totalJoinedCount;
}

// Atomic payout processor for a single user record
window.creditPlayerReward = async function(reqId) {
  const req = joinedRequestsData.find(r => r.id === reqId);
  if (!req) return;
  
  if (req.rewardPaid === true) {
    window.showToast("This reward is already credited.", "warning");
    return;
  }
  
  const kills = Number(req.kills) || 0;
  const rewardAmount = req.rewardAmount !== undefined ? Number(req.rewardAmount) : (kills * activeMatchPerKillPrize);
  
  if (rewardAmount <= 0) {
    window.showToast("No reward amount to credit.", "warning");
    return;
  }
  
  const userDoc = allUsersData.find(u => u.uid === req.userId);
  const playerName = userDoc?.username || req.userName || 'Player';
  
  if (!confirm(`Confirm crediting ₹${rewardAmount} to ${playerName} for ${kills} kills?`)) return;
  
  toggleScreenLoader(true);
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", req.userId);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("Player user record missing.");
      
      const currentBalance = Number(userSnap.data().walletBalance || userSnap.data().wallet || 0);
      const nextBalance = currentBalance + rewardAmount;
      
      transaction.update(userRef, {
        walletBalance: nextBalance,
        wallet: nextBalance,
        updatedAt: serverTimestamp()
      });
      
      const txnRef = doc(collection(db, "walletTransactions"));
      transaction.set(txnRef, {
        id: txnRef.id,
        userId: req.userId,
        type: 'CREDIT',
        amount: rewardAmount,
        title: "Match Reward Credited",
        reason: `Match: ${activeMatchTitle} | ${kills} Kills`,
        status: "success",
        timestamp: serverTimestamp()
      });
      
      const notifRef = doc(collection(db, "notifications"));
      transaction.set(notifRef, {
        type: "notice",
        targetUser: req.userId,
        title: "Match Reward Credited! 🎉",
        message: `You received ₹${rewardAmount} for ${kills} kills in ${activeMatchTitle}. Check your wallet balance!`,
        createdAt: serverTimestamp(),
        read: false
      });
      
      const participantRef = doc(db, "matchParticipants", reqId);
      transaction.update(participantRef, {
        kills: kills,
        rewardAmount: rewardAmount,
        rewardPaid: true,
        paidAt: serverTimestamp()
      });
    });
    
    window.showToast("Reward credited successfully!", "success");
  } catch (err) {
    console.error(err);
    window.showToast("Action failed: " + err.message, "error");
  } finally {
    toggleScreenLoader(false);
  }
};

// Sequential atomic processor for batch executions
window.bulkCreditRewards = async function() {
  const eligible = joinedRequestsData.filter(r => r.rewardPaid !== true && (Number(r.rewardAmount) || 0) > 0);
  
  if (eligible.length === 0) {
    window.showToast("No pending players with positive rewards found to credit.", "warning");
    return;
  }
  
  const totalBulkRewards = eligible.reduce((sum, r) => sum + r.rewardAmount, 0);
  if (!confirm(`Are you sure you want to bulk credit ₹${totalBulkRewards.toLocaleString('en-IN')} to ${eligible.length} players?`)) return;
  
  toggleScreenLoader(true);
  try {
    for (const req of eligible) {
      const kills = Number(req.kills) || 0;
      const rewardAmount = Number(req.rewardAmount);
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", req.userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error(`User profile for UID ${req.userId} is missing.`);
        
        const currentBalance = Number(userSnap.data().walletBalance || userSnap.data().wallet || 0);
        const nextBalance = currentBalance + rewardAmount;
        
        transaction.update(userRef, {
          walletBalance: nextBalance,
          wallet: nextBalance,
          updatedAt: serverTimestamp()
        });
        
        const txnRef = doc(collection(db, "walletTransactions"));
        transaction.set(txnRef, {
          id: txnRef.id,
          userId: req.userId,
          type: 'CREDIT',
          amount: rewardAmount,
          title: "Match Reward Credited",
          reason: `Match: ${activeMatchTitle} | ${kills} Kills`,
          status: "success",
          timestamp: serverTimestamp()
        });
        
        const notifRef = doc(collection(db, "notifications"));
        transaction.set(notifRef, {
          type: "notice",
          targetUser: req.userId,
          title: "Match Reward Credited! 🎉",
          message: `You earned ₹${rewardAmount} for ${kills} kills in ${activeMatchTitle}. Check your wallet balance!`,
          createdAt: serverTimestamp(),
          read: false
        });
        
        const participantRef = doc(db, "matchParticipants", req.id);
        transaction.update(participantRef, {
          kills: kills,
          rewardAmount: rewardAmount,
          rewardPaid: true,
          paidAt: serverTimestamp()
        });
      });
    }
    
    window.showToast(`Bulk payout completed for ${eligible.length} players successfully!`, "success");
  } catch (err) {
    console.error(err);
    window.showToast("Bulk payout partial failure: " + err.message, "error");
  } finally {
    toggleScreenLoader(false);
  }
};

// Initialize listeners on module bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initMatchTournaments();
});