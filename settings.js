// settings.js
import { db, storage } from "./firebase.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Fetch configurations to form inputs
export async function loadAppSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "app_config"));
    if (snap.exists()) {
      const d = snap.data();
      document.getElementById('app-name').value = d.appName || "";
      document.getElementById('app-ref-bonus').value = d.referralBonus || "";
      document.getElementById('app-whatsapp').value = d.whatsapp || "";
      document.getElementById('app-telegram').value = d.telegram || "";
      document.getElementById('app-instagram').value = d.instagram || "";
      document.getElementById('app-youtube').value = d.youtube || "";
      document.getElementById('app-maintenance').checked = d.maintenance || false;
    }
  } catch (err) {
    console.error("Failed to load app settings:", err);
  }

  try {
    // Fetch UPI Config settings
    const paySnap = await getDoc(doc(db, "settings", "payment_config"));
    if (paySnap.exists()) {
      const p = paySnap.data();
      document.getElementById('pay-upi-id').value = p.upiId || "";
      document.getElementById('pay-account-name').value = p.accountName || "";
      document.getElementById('pay-min-deposit').value = p.minDeposit || "";
      document.getElementById('pay-min-withdraw').value = p.minWithdraw || "";
      document.getElementById('pay-deposit-note').value = p.depositNote || "";
      document.getElementById('pay-withdraw-note').value = p.withdrawNote || "";
      
      if (p.qrCodeUrl) {
        const preview = document.getElementById('pay-qr-preview');
        const placeholder = document.getElementById('pay-qr-preview-placeholder');
        if (preview && placeholder) {
          preview.src = p.qrCodeUrl;
          preview.classList.remove('hidden');
          placeholder.classList.add('hidden');
        }
      }
    }
  } catch (err) {
    console.error("Failed to load payment settings:", err);
  }
}

// Sync App Configurations
document.getElementById('app-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('app-submit-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Syncing...`;

  try {
    const payload = {
      appName: document.getElementById('app-name').value,
      referralBonus: Number(document.getElementById('app-ref-bonus').value),
      whatsapp: document.getElementById('app-whatsapp').value,
      telegram: document.getElementById('app-telegram').value,
      instagram: document.getElementById('app-instagram').value,
      youtube: document.getElementById('app-youtube').value,
      maintenance: document.getElementById('app-maintenance').checked,
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, "settings", "app_config"), payload, { merge: true });
    window.showToast("App Settings Saved.", "success");
  } catch(e) { 
    window.showToast(e.message, "error"); 
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// Sync Payment Gateway Configurations
document.getElementById('payment-settings-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('pay-submit-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...`;

  const file = document.getElementById('pay-qr-file').files[0];
  let qrUrl = document.getElementById('pay-qr-preview').src;

  try {
    if (file) {
      const storageRef = ref(storage, `payment_qrs/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(storageRef, file);
      qrUrl = await getDownloadURL(snap.ref);
    }

    const payload = {
      upiId: document.getElementById('pay-upi-id').value,
      accountName: document.getElementById('pay-account-name').value,
      minDeposit: Number(document.getElementById('pay-min-deposit').value),
      minWithdraw: Number(document.getElementById('pay-min-withdraw').value),
      depositNote: document.getElementById('pay-deposit-note').value,
      withdrawNote: document.getElementById('pay-withdraw-note').value,
      qrCodeUrl: qrUrl.startsWith('http') ? qrUrl : "",
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "settings", "payment_config"), payload, { merge: true });
    window.showToast("Payment Gateways saved successfully.", "success");
    
    // Update preview block
    if (payload.qrCodeUrl) {
      const preview = document.getElementById('pay-qr-preview');
      const placeholder = document.getElementById('pay-qr-preview-placeholder');
      if (preview && placeholder) {
        preview.src = payload.qrCodeUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
      }
    }
  } catch (error) {
    window.showToast("Save failed: " + error.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});