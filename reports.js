// reports.js
import { db } from "./firebase.js";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Starts real-time support tickets monitoring feed
export function setupSupportListener() {
  onSnapshot(collection(db, "supportTickets"), (snap) => {
    const feed = document.getElementById("support-tickets-feed");
    if (!feed) return;
    feed.innerHTML = "";

    if (snap.empty) {
      feed.innerHTML = `
        <div class="col-span-full py-10 text-center glass-admin rounded-2xl border border-white/5">
          <i class="fa-solid fa-folder-open text-3xl text-gray-600 mb-2"></i>
          <p class="text-xs text-gray-500 uppercase tracking-widest font-bold">No Support Tickets Found</p>
        </div>`;
      return;
    }

    snap.forEach(d => {
      const t = d.data();
      const card = document.createElement("div");
      card.className = "glass-admin p-5 rounded-2xl border border-white/5 space-y-3";
      
      const statusClass = t.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400';
      const ticketTime = t.timestamp ? t.timestamp.toDate().toLocaleString() : 'Recent';
      
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <div>
            <h5 class="text-sm font-bold text-white">${t.subject || "Support Request"}</h5>
            <span class="text-[10px] text-gray-500 block truncate max-w-[180px]">From UID: ${t.userId || "Unknown"}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[9px] uppercase font-bold ${statusClass}">${t.status || 'open'}</span>
        </div>
        <p class="text-xs text-gray-300 leading-relaxed">${t.message || ""}</p>
        <div class="flex justify-between items-center text-[10px] pt-2 border-t border-white/5">
          <span class="text-gray-500">${ticketTime}</span>
          ${t.status !== 'resolved' ? `
            <button onclick="window.resolveSupportTicket('${d.id}')" class="px-3 py-1 bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded transition uppercase font-bold text-[9px]">
              Resolve
            </button>` : ''}
        </div>
      `;
      feed.appendChild(card);
    });
  });
}

// Action execution for resolving open support tickets
window.resolveSupportTicket = async function(ticketId) {
  try {
    await updateDoc(doc(db, "supportTickets", ticketId), {
      status: "resolved",
      resolvedAt: serverTimestamp()
    });
    window.showToast("Ticket resolved successfully.", "success");
  } catch (error) {
    window.showToast("Action failed: " + error.message, "error");
  }
};