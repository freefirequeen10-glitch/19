// banners.js
import { db, storage } from "./firebase.js";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  setDoc, 
  doc, 
  getDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Starts real-time sliders and category banners load cycles
export function setupBannersListener() {
  // Slider Images monitor
  onSnapshot(collection(db, "sliderImages"), (snap) => {
    const feed = document.getElementById('banners-list');
    if (!feed) return;
    feed.innerHTML = '';
    
    snap.forEach(d => {
      if (d.id === 'soloBanner' || d.id === 'duoBanner' || d.id === 'squadBanner') return;
      
      const b = d.data();
      const block = document.createElement('div');
      block.className = "relative rounded-xl overflow-hidden border border-white/10 group h-24 bg-black";
      block.innerHTML = `
        <img src="${b.imageUrl}" class="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition">
        <button onclick="window.deleteBanner('${d.id}')" class="absolute inset-0 m-auto w-8 h-8 bg-rose-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition shadow-[0_0_10px_rgba(244,63,94,0.5)]">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      feed.appendChild(block);
    });
  });

  // Fetch category-specific match banners
  ['solo', 'duo', 'squad'].forEach(async (type) => {
     try {
       const docSnap = await getDoc(doc(db, "sliderImages", `${type}Banner`));
       const previewEl = document.getElementById(`preview-banner-${type}`);
       if (docSnap.exists() && previewEl) {
         previewEl.src = docSnap.data().imageUrl || '';
       }
     } catch (e) {
       console.error(`Failed to load category banner for ${type}:`, e);
     }
  });
}

// Add dynamic slideshow banners
document.getElementById('slider-image-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('slider-submit-btn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Adding...`;

  try {
    let url = document.getElementById('slider-url').value.trim();
    const file = document.getElementById('slider-image-file').files[0];
    
    if (file) {
      const storageRef = ref(storage, `sliders/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(storageRef, file);
      url = await getDownloadURL(snap.ref);
    }
    
    if (!url) {
      window.showToast("Provide an image file or direct URL.", "warning");
      return;
    }
    
    await addDoc(collection(db, "sliderImages"), { 
      imageUrl: url, 
      createdAt: serverTimestamp() 
    });
    
    window.showToast("Slide banner added.", "success");
    document.getElementById('slider-image-form').reset();
  } catch(e) { 
    window.showToast("Upload failed: " + e.message, "error"); 
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
});

// Delete dynamic slider graphic
window.deleteBanner = async function(id) {
  if (confirm("Remove this slide graphic from homepage?")) {
    try {
      await deleteDoc(doc(db, "sliderImages", id));
      window.showToast("Slide removed.", "success");
    } catch(e) {
      window.showToast("Removal failed: " + e.message, "error");
    }
  }
};

// Update Match Category static graphics (saved to sliderImages collection)
window.saveCategoryBanner = async function(type) {
  const fileInput = document.getElementById(`file-banner-${type}`);
  const file = fileInput?.files[0];
  
  if (!file) {
    window.showToast("Please choose an image file first.", "warning");
    return;
  }
  
  try {
    const storageRef = ref(storage, `category_banners/${type}_${Date.now()}.png`);
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);
    
    await setDoc(doc(db, "sliderImages", `${type}Banner`), { 
      imageUrl: url,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    const previewEl = document.getElementById(`preview-banner-${type}`);
    if (previewEl) {
      previewEl.src = url;
    }
    
    window.showToast(`${type.toUpperCase()} banner updated successfully.`, "success");
    fileInput.value = ''; // Reset file input
  } catch(e) { 
    window.showToast("Failed to upload category banner: " + e.message, "error"); 
  }
};