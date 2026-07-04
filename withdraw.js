// withdraw.js
import { db } from "./firebase.js";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  runTransaction, 
  doc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Starts the real-time payout operations feed subscription
export function setupWithdrawListener() {
  onSnapshot(query(collection(db, "withdrawRequests"), orderBy("timestamp", "desc")), (snap) => {
    let pendingCount = 0; 
    let totalAmt = 0;
    const tbody = document.getElementById('withdraw-requests-table');
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
        <td class="p-4 font-bold text-rose-400 font-rajdhani text-lg">₹${req.amount}</td>
        <td class="p-4 font-mono text-gray-400 text-xs">${req.upiId || req.phonePe || 'N/A'}</td>
        <td class="p-4 text-[10px] text-gray-500">${req.timestamp ? req.timestamp.toDate().toLocaleString() : ''}</td>
        <td class="p-4 space-x-2 text-right">
          ${req.status === 'pending' ? `
            <button onclick="window.processWithdraw('${d.id}', 'approve')" class="px-3 py-1.5 bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white rounded text-[9px] font-bold uppercase transition">Approve</button>
            <button onclick="window.processWithdraw('${d.id}', 'reject')" class="px-3 py-1.5 bg-rose-600/30 text-rose-400 border border-rose-500/50 hover:bg-rose-600 hover:text-white rounded text-[9px] font-bold uppercase transition">Reject (Refund)</button>
          ` : `<span class="uppercase text-[9px] font-bold ${req.status === 'approved' ? 'text-emerald-500' : 'text-rose-500'}">${req.status}</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // Synchronize layout statistics
    const statPendingWithdrawals = document.getElementById('stat-pending-withdrawals');
    const statTotalWithdrawals = document.getElementById('stat-total-withdrawals');
    
    if (statPendingWithdrawals) statPendingWithdrawals.innerText = pendingCount;
    if (statTotalWithdrawals) statTotalWithdrawals.innerText = "₹" + totalAmt;
  });
}

// Transaction block to safely process approved or rejected withdrawals
window.processWithdraw = async function(id, action) {
  if (!confirm(`Are you sure you want to ${action.toUpperCase()} this withdrawal?`)) return;
  try {
    await runTransaction(db, async (transaction) => {
      const wRef = doc(db, "withdrawRequests", id);
      const wSnap = await transaction.get(wRef);
      if (!wSnap.exists() || wSnap.data().status !== "pending") throw new Error("Invalid or already processed request.");

      if (action === "approve") {
        transaction.update(wRef, { status: "approved", processedAt: serverTimestamp() });
      } else {
        const uid = wSnap.data().userId;
        const amt = Number(wSnap.data().amount);
        const userRef = doc(db, "users", uid);
        const userSnap = await transaction.get(userRef);

        transaction.update(wRef, { status: "rejected", processedAt: serverTimestamp() });

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
          title: "Withdrawal Refund", 
          status: "success", 
          timestamp: serverTimestamp()
        });
      }
    });
    window.showToast(`Withdrawal ${action}d successfully.`, "success");
  } catch(e) { 
    window.showToast(e.message, "error"); 
  }
};