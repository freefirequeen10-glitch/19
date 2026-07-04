// notifications.js
import { db } from "./firebase.js";
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Event listener for dispatching notification broadcasts
document.getElementById('broadcast-notif-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const type = document.getElementById('notif-type').value;
  const targetUser = document.getElementById('notif-target-user').value.trim();
  const title = document.getElementById('notif-title').value;
  const message = document.getElementById('notif-message').value;
  const submitBtn = document.getElementById('notif-submit-btn');

  if (!title || !message) {
    window.showToast("Title and message body are required.", "warning");
    return;
  }

  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Deploying...`;

  try {
    // Generate and write notification record to collection
    await addDoc(collection(db, "notifications"), {
      type: type,
      targetUser: targetUser || "all",
      title: title,
      message: message,
      createdAt: serverTimestamp(),
      read: false
    });

    window.showToast("Broadcast message successfully deployed.", "success");
    document.getElementById('broadcast-notif-form').reset();
  } catch (error) {
    window.showToast("Broadcast deployment failed: " + error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
});