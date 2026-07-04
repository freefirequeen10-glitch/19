// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBrL71mdvZ6uM611o2KPUvdTfSpGpn_DJc",
  authDomain: "tournament-11559.firebaseapp.com",
  databaseURL: "https://tournament-11559-default-rtdb.firebaseio.com",
  projectId: "tournament-11559",
  storageBucket: "tournament-11559.firebasestorage.app",
  messagingSenderId: "618975909041",
  appId: "1:618975909041:web:a0723749118cfb0a273e90",
  measurementId: "G-YJPGLXBG2Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Complete Firebase Presence System
let activeUserRef = null;
let heartbeatInterval = null;

// Write status updates safely to Firestore
async function updateOnlineStatus(isOnline) {
  if (!activeUserRef) return;
  try {
    const payload = {
      online: isOnline,
      lastSeen: serverTimestamp()
    };
    if (isOnline) {
      payload.updatedAt = serverTimestamp();
    }
    // SetDoc with merge: true safely handles missing documents and avoids overwriting registration info
    await setDoc(activeUserRef, payload, { merge: true });
  } catch (err) {
    // Fail silently to prevent session disruption
  }
}

// Maintain active state heartbeat
function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (activeUserRef && navigator.onLine && document.visibilityState === "visible") {
      updateOnlineStatus(true);
    }
  }, 20000); // 20-second active heartbeat
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Watch auth sessions automatically
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Verify standard user context (skip presence system for admins on admin dashboard pages)
    const isAdminPath = window.location.pathname.includes("admin.html");
    if (!isAdminPath) {
      activeUserRef = doc(db, "users", user.uid);
      await updateOnlineStatus(true);
      startHeartbeat();
    }
  } else {
    stopHeartbeat();
    if (activeUserRef) {
      await updateOnlineStatus(false);
      activeUserRef = null;
    }
  }
});

// Presence event hooks
const handleDisconnect = () => {
  if (activeUserRef) {
    updateOnlineStatus(false);
  }
};

window.addEventListener("beforeunload", handleDisconnect);
window.addEventListener("pagehide", handleDisconnect);

document.addEventListener("visibilitychange", () => {
  if (activeUserRef) {
    const isVisible = document.visibilityState === "visible";
    updateOnlineStatus(isVisible);
    if (isVisible) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }
  }
});

window.addEventListener("online", () => {
  if (activeUserRef) {
    updateOnlineStatus(true);
    startHeartbeat();
  }
});

window.addEventListener("offline", () => {
  if (activeUserRef) {
    updateOnlineStatus(false);
    stopHeartbeat();
  }
});

export { app, auth, db, storage };