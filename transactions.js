// transactions.js
import { db } from "./firebase.js";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  runTransaction, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Starts the real-time transactions & admissions monitor
export function setupTransactionsListener() {
  // Real-time Match Join Requests Listener
  onSnapshot(query(collection(db, "joinRequests"), orderBy("timestamp", "desc")), (snap) => {
    const tbody = document.getElementById('join-requests-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    snap.forEach(d => {
      const req = d.data();
      const tr = document.createElement('tr');
      tr.className = "border-b border-white/5 hover:bg-white/5";
      
      const reqTime = req.timestamp ? req.timestamp.toDate().toLocaleString() : 'N/A';
      
      tr.innerHTML = `
        <td class="p-4">
          <span class="font-bold text-white block">${req.playerName || 'Unknown'}</span>
          <span class="text-[10px] text-gray-500">${req.userEmail || ''}</span>
        </td>
        <td class="p-4 font-bold text-admin-accent">${req.tournamentName || 'Tournament'}</td>
        <td class="p-4 font-mono text-gray-300 text-[10px]">${req.gameUid || 'N/A'}<br><span class="text-admin-neon">${req.gameName || ''}</span></td>
        <td class="p-4 text-[10px] text-gray-500">${reqTime}</td>
        <td class="p-4 space-x-2 text-right">
          ${req.status === 'pending' ? `
            <button onclick="window.processJoinRequest('${d.id}', 'approve', '${req.userId}', '${req.tournamentId}')" class="px-3 py-1.5 bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white rounded text-[9px] font-bold uppercase transition">Approve</button>
            <button onclick="window.processJoinRequest('${d.id}', 'reject', '${req.userId}', '${req.tournamentId}')" class="px-3 py-1.5 bg-rose-600/30 text-rose-400 border border-rose-500/50 hover:bg-rose-600 hover:text-white rounded text-[9px] font-bold uppercase transition">Reject</button>
          ` : `<span class="uppercase text-[9px] font-bold ${req.status === 'approved' ? 'text-emerald-500' : 'text-rose-500'}">${req.status}</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  });

  // Real-time Deposit Audits Listener
  onSnapshot(query(collection(db, "depositRequests"), orderBy("timestamp", "desc")), (snap) => {
    let pendingCount = 0; 
    let totalAmt = 0;
    const tbody = document.getElementById('deposit-requests-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    snap.forEach(d => {
      const req = d.data();
      if (req.status === 'pending') pendingCount++;
      if (req.status === 'approved') totalAmt += Number(req.amount || 0);
      
      const tr = document.createElement('tr');
      tr.className = "border-b border-white/5 hover:bg-white/5";
      tr.innerHTML = `
        <td class="p-4"><span class="font-bold text-white">${req.username || req.userId}</span></td>
        <td class="p-4 font-bold text-emerald-400 font-rajdhani text-lg">₹${req.amount}</td>
        <td class="p-4 font-mono text-gray-400 text-xs">${req.referenceId || 'N/A'}</td>
        <td class="p-4">
          <button onclick="window.openPreview('${req.screenshotUrl}')" class="text-[10px] uppercase font-bold text-admin-neon border border-admin-neon/50 px-3 py-1 rounded hover:bg-admin-neon hover:text-white transition">
            <i class="fa-solid fa-image"></i> View
          </button>
        </td>
        <td class="p-4 space-x-2 text-right">
          ${req.status === 'pending' ? `
            <button onclick="window.processDeposit('${d.id}', 'approve')" class="px-3 py-1.5 bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white rounded text-[9px] font-bold uppercase transition">Approve</button>
            <button onclick="window.processDeposit('${d.id}', 'reject')" class="px-3 py-1.5 bg-rose-600/30 text-rose-400 border border-rose-500/50 hover:bg-rose-600 hover:text-white rounded text-[9px] font-bold uppercase transition">Reject</button>
          ` : `<span class="uppercase text-[9px] font-bold ${req.status === 'approved' ? 'text-emerald-500' : 'text-rose-500'}">${req.status}</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // Sync structural deposit statistic monitors
    const statPendingDeposits = document.getElementById('stat-pending-deposits');
    const statTotalDeposits = document.getElementById('stat-total-deposits');
    
    if (statPendingDeposits) statPendingDeposits.innerText = pendingCount;
    if (statTotalDeposits) statTotalDeposits.innerText = "₹" + totalAmt;
  });
}

// Transaction block to safely process approved or rejected deposits
window.processDeposit = async function(id, action) {
  if (!confirm(`Are you sure you want to ${action.toUpperCase()} this deposit?`)) return;
  try {
    await runTransaction(db, async (transaction) => {
      const depRef = doc(db, "depositRequests", id);
      const depSnap = await transaction.get(depRef);
      if (!depSnap.exists()) throw new Error("Deposit request missing.");
      if (depSnap.data().status !== "pending") throw new Error("Request already processed.");

      if (action === "approve") {
        const uid = depSnap.data().userId;
        const amt = Number(depSnap.data().amount);
        const userRef = doc(db, "users", uid);
        const userSnap = await transaction.get(userRef);
        
        transaction.update(depRef, { status: "approved", processedAt: serverTimestamp() });
        
        if (userSnap.exists()) {
          const cBalance = userSnap.data().wallet || userSnap.data().walletBalance || 0;
          transaction.update(userRef, { 
              wallet: cBalance + amt,
              walletBalance: cBalance + amt,
              updatedAt: serverTimestamp()
          });
        }
        
        const txnRef = doc(collection(db, "walletTransactions"));
        transaction.set(txnRef, {
          id: txnRef.id,
          userId: uid, 
          type: 'CREDIT', 
          amount: amt, 
          title: "Deposit Approved", 
          status: "success", 
          timestamp: serverTimestamp()
        });
      } else {
        transaction.update(depRef, { status: "rejected", processedAt: serverTimestamp() });
      }
    });
    window.showToast(`Deposit ${action}d successfully.`, "success");
  } catch(e) { 
    window.showToast(e.message, "error"); 
  }
};

// Player Join Request State updates
window.processJoinRequest = async function(id, action, userId, tournId) {
  if (!confirm(`${action.toUpperCase()} player join request?`)) return;
  try {
    if (action === 'approve') {
      await updateDoc(doc(db, "joinRequests", id), { status: "approved" });
      await updateDoc(doc(db, "tournaments", tournId), { joinedCount: increment(1) });
      window.showToast("Player Approved.", "success");
    } else {
      await updateDoc(doc(db, "joinRequests", id), { status: "rejected" });
      window.showToast("Player Rejected.", "error");
    }
  } catch(e) { 
    window.showToast("Error processing request: " + e.message, "error"); 
  }
};