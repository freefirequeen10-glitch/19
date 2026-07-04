// auth.js
import { auth, db } from "./firebase.js";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendEmailVerification,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  updateDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Import modules to trigger them upon authorized state
import { setupUsersListener } from "./users.js";
import { setupTournamentsListener } from "./matches.js";
import { setupTransactionsListener } from "./transactions.js";
import { setupWithdrawListener } from "./withdraw.js";
import { setupBannersListener } from "./banners.js";
import { setupSupportListener } from "./reports.js";
import { loadAppSettings } from "./settings.js";
import { initializeAnalyticsCharts } from "./analytics.js";

let currentAdminId = null;
let currentAdminRole = "admin";
let isSetupMode = false;

// Expose navigation form helpers
window.toggleAuthForms = function(view) {
  ['login', 'register', 'forgot'].forEach(v => {
    document.getElementById(`admin-${v}-form`).classList.add('hidden');
  });
  document.getElementById(`admin-${view}-form`).classList.remove('hidden');
};

// Check and handle authentication cycles
onAuthStateChanged(auth, async (user) => {
  const guard = document.getElementById('admin-auth');
  const container = document.getElementById('app-container');
  const subDesc = document.getElementById('auth-sub-desc');

  try {
    // Check if there are any administrators configured
    const adminsSnap = await getDocs(collection(db, "admins"));
    if (adminsSnap.empty) {
      isSetupMode = true;
      document.getElementById('setup-mode-banner').classList.remove('hidden');
      if (subDesc) subDesc.innerText = "System Setup Active";
    } else {
      isSetupMode = false;
      document.getElementById('setup-mode-banner').classList.add('hidden');
      if (subDesc) subDesc.innerText = "Access Protected Section";
    }

    if (user) {
      const docSnap = await getDoc(doc(db, "admins", user.uid));
      
      if (docSnap.exists() && docSnap.data().status !== "suspended") {
        currentAdminId = user.uid;
        currentAdminRole = docSnap.data().role || "admin";
        
        // Update user interfaces
        document.getElementById('admin-role-badge').innerText = currentAdminRole;
        if(document.getElementById('admin-role-badge-mobile')) {
          document.getElementById('admin-role-badge-mobile').innerText = currentAdminRole;
        }
        
        if (currentAdminRole === "super_admin") {
          document.querySelectorAll('.super-admin-only').forEach(el => el.classList.remove('hidden'));
          setupAdminsListener();
        } else {
          document.querySelectorAll('.super-admin-only').forEach(el => el.classList.add('hidden'));
        }
        
        guard.classList.add('hidden');
        container.classList.remove('hidden');
        
        // Setup modules listeners
        setupUsersListener();
        setupTournamentsListener();
        setupTransactionsListener();
        setupWithdrawListener();
        setupBannersListener();
        setupSupportListener();
        loadAppSettings();
        initializeAnalyticsCharts();
      } else {
        if (docSnap.exists() && docSnap.data().status === "suspended") {
          window.showToast("Your admin account is suspended.", "error");
        } else if (user.emailVerified === false) {
          window.showToast("Please verify your email address.", "warning");
        } else {
          window.showToast("Unauthorized. Not an administrator.", "error");
        }
        await signOut(auth);
        guard.classList.remove('hidden');
        container.classList.add('hidden');
      }
    } else {
      guard.classList.remove('hidden');
      container.classList.add('hidden');
    }
  } catch(err) { 
    console.error("Auth state transition error:", err); 
  }
});

// Admin Log-In Submission
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('admin-login-btn');
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "AUTHORIZING...";

  const email = document.getElementById('adm-email').value.trim();
  const password = document.getElementById('adm-password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if configuration exists
    const docSnap = await getDoc(doc(db, "admins", user.uid));
    if (!docSnap.exists() && !isSetupMode) {
      window.showToast("Access Denied. Admin identity missing.", "error");
      await signOut(auth);
    } else if (docSnap.exists() && docSnap.data().status === "suspended") {
      window.showToast("Account suspended.", "error");
      await signOut(auth);
    } else {
      window.showToast("Session Authorized.", "success");
    }
  } catch(err) { 
    window.showToast(err.message, "error"); 
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
});

// Admin Sign-Out Trigger
document.getElementById('admin-logout-btn').addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.showToast("Disconnected successfully.", "info");
  } catch (error) {
    window.showToast("Sign out failed: " + error.message, "error");
  }
});

// Admin Registration Submission
document.getElementById('admin-register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-submit-btn');
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "PROCESSING...";

  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;

  if (password !== confirm) {
    window.showToast("Passwords do not match.", "error");
    btn.disabled = false;
    btn.innerText = originalText;
    return;
  }

  try {
    if (isSetupMode) {
      // Direct registration as Super Admin in Setup Mode
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      
      await setDoc(doc(db, "admins", credential.user.uid), {
        name: name,
        email: email,
        role: "super_admin",
        status: "active",
        createdAt: serverTimestamp()
      });

      window.showToast("Super Admin registered. Please verify your email.", "success");
      window.toggleAuthForms('login');
    } else {
      // Validate administrative invite
      const inviteQuery = query(collection(db, "adminInvites"), where("email", "==", email), where("status", "==", "pending"));
      const querySnap = await getDocs(inviteQuery);

      if (querySnap.empty) {
        window.showToast("No pending invite found for this email address.", "error");
      } else {
        const inviteDoc = querySnap.docs[0];
        const inviteData = inviteDoc.data();
        
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(credential.user);

        // Accept invite and write to administrators
        await setDoc(doc(db, "admins", credential.user.uid), {
          name: name,
          email: email,
          role: inviteData.role || "admin",
          status: "active",
          createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "adminInvites", inviteDoc.id), {
          status: "accepted",
          acceptedAt: serverTimestamp()
        });

        window.showToast("Account claimed. Verification email sent.", "success");
        window.toggleAuthForms('login');
      }
    }
  } catch(err) {
    window.showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
});

// Admin Password Recovery Submission
document.getElementById('admin-forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('forgot-submit-btn');
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "SENDING...";

  const email = document.getElementById('forgot-email').value.trim();

  try {
    await sendPasswordResetEmail(auth, email);
    window.showToast("Recovery email dispatched.", "success");
    window.toggleAuthForms('login');
  } catch(err) {
    window.showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
});

// Dispatch Invitations (Staff Hierarchy System)
document.getElementById('invite-admin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('inv-submit-btn');
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "DISPATCHING...";

  const name = document.getElementById('inv-name').value.trim();
  const email = document.getElementById('inv-email').value.trim();
  const role = document.getElementById('inv-role').value;

  try {
    // Generate Invite Document
    const inviteRef = doc(collection(db, "adminInvites"));
    await setDoc(inviteRef, {
      id: inviteRef.id,
      name: name,
      email: email,
      role: role,
      status: "pending",
      invitedBy: currentAdminId,
      createdAt: serverTimestamp()
    });

    window.showToast(`Invite successfully dispatched to ${email}`, "success");
    document.getElementById('invite-admin-form').reset();
  } catch (error) {
    window.showToast(error.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
});

// Real-time Staff Engine monitor
function setupAdminsListener() {
  onSnapshot(collection(db, "admins"), (snap) => {
    const tbody = document.getElementById('admins-list-table');
    if (!tbody) return;
    tbody.innerHTML = '';

    snap.forEach(d => {
      const staff = d.data();
      const tr = document.createElement('tr');
      tr.className = "border-b border-white/5 hover:bg-white/5";

      const statusBadge = staff.status === "suspended" 
        ? `<span class="px-2 py-0.5 bg-rose-950/40 border border-rose-500/50 text-rose-400 font-bold uppercase rounded text-[9px]">Suspended</span>`
        : `<span class="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 font-bold uppercase rounded text-[9px]">Active</span>`;

      tr.innerHTML = `
        <td class="p-3">
          <span class="font-bold text-white block">${staff.name || 'Anonymous'}</span>
          <span class="text-[10px] text-gray-500">${staff.email}</span>
        </td>
        <td class="p-3 font-semibold uppercase tracking-wider text-[10px] text-admin-accent">${staff.role || 'admin'}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 text-right">
          ${staff.role !== 'super_admin' ? `
            <button onclick="window.toggleStaffSuspension('${d.id}', '${staff.status || 'active'}')" class="px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded text-[9px] font-bold uppercase transition">
              ${staff.status === 'suspended' ? 'Activate' : 'Suspend'}
            </button>
          ` : `<span class="text-[9px] text-gray-600 uppercase font-black tracking-widest">Locked</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// Suspend or activate administrators
window.toggleStaffSuspension = async function(staffId, currentStatus) {
  if (currentAdminRole !== "super_admin") {
    window.showToast("Denied. Super Admins only.", "warning");
    return;
  }
  
  const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
  if (confirm(`Are you sure you want to change the status to ${nextStatus.toUpperCase()}?`)) {
    try {
      await updateDoc(doc(db, "admins", staffId), {
        status: nextStatus,
        updatedAt: serverTimestamp()
      });
      window.showToast("Staff status updated successfully.", "success");
    } catch (error) {
      window.showToast("Action failed: " + error.message, "error");
    }
  }
};

export { currentAdminId, currentAdminRole };