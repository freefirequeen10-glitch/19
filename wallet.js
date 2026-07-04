// wallet.js
import { db } from "./firebase.js";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { allUsersData, renderUsers } from "./users.js";

// Global Wallet modal triggers
window.openWalletModal = async function(userId) {
  document.getElementById('modal-user-id').value = userId;
  document.getElementById('modal-uid-display').innerText = userId + " (Fetching Balance...)";
  document.getElementById('manual-amount').value = '';
  document.getElementById('manual-reason').value = '';
  document.getElementById('wallet-modal').classList.remove('opacity-0', 'pointer-events-none');

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const currentBalance = Number(snap.data().walletBalance || snap.data().wallet || 0);
      document.getElementById('modal-uid-display').innerText = userId + ` | Bal: ₹${currentBalance}`;
    } else {
      document.getElementById('modal-uid-display').innerText = userId + " | Not Found";
    }
  } catch (error) {
    document.getElementById('modal-uid-display').innerText = userId;
  }
};

window.closeWalletModal = function() {
  document.getElementById('wallet-modal').classList.add('opacity-0', 'pointer-events-none');
};

// Credit & Debit updates
window.executeWalletAction = async function(type) {
  const userId = document.getElementById('modal-user-id').value;
  const amount = Number(document.getElementById('manual-amount').value);
  const reason = document.getElementById('manual-reason').value.trim();
  
  if(!userId || isNaN(amount) || amount <= 0) return window.showToast("Invalid amount.", "warning");
  if(!reason) return window.showToast("Reason/Notes required for audit.", "warning");

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      window.showToast("User missing.", "error");
      return;
    }

    const currentBalance = Number(snap.data().walletBalance || snap.data().wallet || 0);
    let newBalance;

    if (type === 'admin_debit') {
      if (amount > currentBalance) {
        window.showToast("Insufficient Balance", "error");
        return;
      }
      newBalance = currentBalance - amount;
    } else {
      newBalance = currentBalance + amount;
    }

    // Sync back properties to Firestore user record
    await updateDoc(userRef, { 
        walletBalance: newBalance,
        wallet: newBalance,
        updatedAt: serverTimestamp() 
    });

    // Generate Transaction log for Audit trail
    const txnRef = doc(collection(db, "walletTransactions"));
    await setDoc(txnRef, {
      id: txnRef.id,
      userId: userId,
      type: type === 'admin_credit' ? 'CREDIT' : 'DEBIT',
      amount: type === 'admin_credit' ? amount : -amount,
      reason: reason,
      title: "Admin Adjustment",
      status: "success",
      timestamp: serverTimestamp()
    });

    window.showToast(`Wallet ${type === 'admin_credit' ? 'Credited' : 'Debited'} Successfully`, "success");
    window.closeWalletModal();

    // Local array synchronization to update UI instantly without reload
    const userIndex = allUsersData.findIndex(u => u.uid === userId);
    if(userIndex !== -1) {
        allUsersData[userIndex].walletBalance = newBalance;
        allUsersData[userIndex].wallet = newBalance;
        
        const searchInput = document.getElementById('user-search');
        if(searchInput && searchInput.value === "") {
            renderUsers(allUsersData);
        } else {
            window.filterUsers();
        }

        // Global wallets balance statistic synchronization
        let totalWallet = 0;
        allUsersData.forEach(u => totalWallet += Number(u.wallet || u.walletBalance || 0));
        const totalWalletEl = document.getElementById('stat-total-wallet');
        if (totalWalletEl) totalWalletEl.innerText = "₹" + totalWallet;
    }
  } catch (err) {
    window.showToast(err.message, "error");
  }
};