// tournaments.js
import { db, storage } from "./firebase.js";
import { 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  collection, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { currentAdminRole } from "./auth.js";

// Toggle Custom Winner Field container dynamically
window.toggleWinnerCustomField = function() {
  const typeEl = document.getElementById('tourn-winner-type');
  const customContainer = document.getElementById('winner-custom-container');
  if (typeEl && customContainer) {
    if (typeEl.value === 'Custom') {
      customContainer.classList.remove('hidden');
    } else {
      customContainer.classList.add('hidden');
    }
  }
};

// Layout form display controls
window.toggleTournamentForm = function(open) {
  const container = document.getElementById('tourn-form-container');
  if (open) {
    container.classList.remove('hidden');
    container.scrollIntoView({ behavior: 'smooth' });
  } else {
    container.classList.add('hidden');
    document.getElementById('tournament-crud-form').reset();
    document.getElementById('tourn-id').value = '';
    document.getElementById('tourn-winner-type').value = '1st Place Only';
    window.toggleWinnerCustomField();
    document.getElementById('tourn-room-id-published').checked = false;
    document.getElementById('tourn-room-pass-published').checked = false;
    document.getElementById('tourn-form-title').innerText = "Deploy New Tournament";
  }
};

// Add or Update tournament deployment data
document.getElementById('tournament-crud-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('tourn-save-btn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

  try {
    const tId = document.getElementById('tourn-id').value;
    const file = document.getElementById('tourn-image-file').files[0];
    let imgUrl = document.getElementById('tourn-image').value;

    if (file) {
      const storageRef = ref(storage, `tournament_banners/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(storageRef, file);
      imgUrl = await getDownloadURL(snap.ref);
    }

    const payload = {
      title: document.getElementById('tourn-title').value,
      game: document.getElementById('tourn-game').value,
      mode: document.getElementById('tourn-mode').value,
      map: document.getElementById('tourn-map').value,
      entryFee: Number(document.getElementById('tourn-entry-fee').value),
      prizePool: Number(document.getElementById('tourn-prize-pool').value),
      perKill: Number(document.getElementById('tourn-per-kill').value || 0),
      totalSlots: Number(document.getElementById('tourn-total-slots').value || 100),
      date: document.getElementById('tourn-date').value,
      time: document.getElementById('tourn-time').value,
      status: document.getElementById('tourn-status').value,
      description: document.getElementById('tourn-desc').value,
      banner: imgUrl,
      roomIdPublished: document.getElementById('tourn-room-id-published').checked,
      roomPasswordPublished: document.getElementById('tourn-room-pass-published').checked,
      winnerType: document.getElementById('tourn-winner-type').value,
      winnerCustom: document.getElementById('tourn-winner-custom').value,
      updatedAt: serverTimestamp()
    };

    if (tId) {
      await updateDoc(doc(db, "tournaments", tId), payload);
      await setDoc(doc(db, "roomDetails", tId), {
        roomId: document.getElementById('tourn-room-id').value,
        roomPassword: document.getElementById('tourn-room-pass').value,
        roomPass: document.getElementById('tourn-room-pass').value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      window.showToast("Tournament updated successfully.", "success");
    } else {
      payload.createdAt = serverTimestamp();
      payload.joinedCount = 0;
      const newDocRef = await addDoc(collection(db, "tournaments"), payload);
      await setDoc(doc(db, "roomDetails", newDocRef.id), {
        roomId: document.getElementById('tourn-room-id').value,
        roomPassword: document.getElementById('tourn-room-pass').value,
        roomPass: document.getElementById('tourn-room-pass').value,
        createdAt: serverTimestamp()
      });
      window.showToast("Tournament created successfully.", "success");
    }
    window.toggleTournamentForm(false);
  } catch (error) {
    window.showToast("Save failed: " + error.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
});

// Load tournament values to inputs for modification
window.editTournament = async function(id) {
  try {
    const docSnap = await getDoc(doc(db, "tournaments", id));
    const roomSnap = await getDoc(doc(db, "roomDetails", id));
    if (docSnap.exists()) {
      const t = docSnap.data();
      const r = roomSnap.exists() ? roomSnap.data() : {};
      document.getElementById('tourn-id').value = id;
      document.getElementById('tourn-title').value = t.title || "";
      document.getElementById('tourn-game').value = t.game || "";
      document.getElementById('tourn-mode').value = t.mode || "Solo";
      document.getElementById('tourn-map').value = t.map || "";
      document.getElementById('tourn-total-slots').value = t.totalSlots || 100;
      document.getElementById('tourn-entry-fee').value = t.entryFee || 0;
      document.getElementById('tourn-prize-pool').value = t.prizePool || 0;
      document.getElementById('tourn-per-kill').value = t.perKill || 0;
      document.getElementById('tourn-date').value = t.date || "";
      document.getElementById('tourn-time').value = t.time || "";
      document.getElementById('tourn-status').value = t.status || "active";
      document.getElementById('tourn-image').value = t.banner || "";
      document.getElementById('tourn-desc').value = t.description || "";
      document.getElementById('tourn-room-id').value = r.roomId || t.roomId || "";
      
      const passVal = r.roomPassword !== undefined ? r.roomPassword : (r.roomPass !== undefined ? r.roomPass : (t.roomPassword || t.roomPass || ""));
      document.getElementById('tourn-room-pass').value = passVal;
      
      document.getElementById('tourn-winner-type').value = t.winnerType || "1st Place Only";
      document.getElementById('tourn-winner-custom').value = t.winnerCustom || "";
      window.toggleWinnerCustomField();

      document.getElementById('tourn-room-id-published').checked = t.roomIdPublished || false;
      document.getElementById('tourn-room-pass-published').checked = t.roomPasswordPublished || false;

      document.getElementById('tourn-form-title').innerText = "Edit Arena: " + t.title;
      window.toggleTournamentForm(true);
    }
  } catch (e) { 
    window.showToast("Error loading tournament", "error"); 
  }
};

// Transition tournament status to active
window.publishTournament = async function(id) {
  if (confirm("Publish this tournament? Status will change to Active and will be visible to users.")) {
    try {
      await updateDoc(doc(db, "tournaments", id), { status: "active" });
      window.showToast("Tournament Published!", "success");
    } catch(e) {
      window.showToast("Failed to publish: " + e.message, "error");
    }
  }
};

// Deconstruct and remove tournament document
window.deleteTournament = async function(id) {
  if (currentAdminRole !== "super_admin") {
    window.showToast("Denied! Super Admins only.", "warning");
    return;
  }
  
  if (confirm("Confirm DELETION of arena? This cannot be undone.")) {
    try {
      await deleteDoc(doc(db, "tournaments", id));
      await deleteDoc(doc(db, "roomDetails", id));
      window.showToast("Arena deleted.", "success");
    } catch (error) {
      window.showToast("Deletion failed: " + error.message, "error");
    }
  }
};