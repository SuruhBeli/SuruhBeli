// ===============================
// PROFIL.JS FINAL (CLOUDINARY FIX)
// ===============================

// ===== DOMS =====
const editPopup = document.getElementById("editPopup");
const confirmPopup = document.getElementById("confirmPopup");
const successPopup = document.getElementById("successPopup");

function safeOnClick(id, handler){
  const el = document.getElementById(id);
  if (!el) return;
  el.onclick = handler;
}

// ===== FLAG =====
let pendingSave = false;
let pendingLogout = false;

// ===== SET DATA DEFAULT =====
function setDefaultProfile(){
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const phoneEl = document.getElementById("profilePhone");
  const avatarEl = document.getElementById("profileAvatar");

  if(nameEl) nameEl.textContent = "Pengguna";
  if(emailEl) emailEl.textContent = "-";
  if(phoneEl) phoneEl.textContent = "-";
  if(avatarEl) avatarEl.textContent = "U";
}

// ===== LOAD DATA PROFIL USER (Realtime) =====
window.initProfil = async function() {
  console.log("👤 Profil page init");

  const userId = window.userId;

  if (!userId) return setDefaultProfile();

  try {
    const docRef = window.db.collection("users").doc(userId);
    docRef.onSnapshot(doc => {
      if (!doc.exists) return;
      const data = doc.data();
      setProfileUI(data);
    });
  } catch (err) {
    console.error("Error load profil:", err);
    setDefaultProfile();
  }
};

// ===== SET UI =====
function setProfileUI(data) {
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const phoneEl = document.getElementById("profilePhone");
  const avatarEl = document.getElementById("profileAvatar");

  const nama = data.nama || "Pengguna";
  const nohp = data.noHP || "-";
  const email = data.email || "-";

  if (nameEl) nameEl.textContent = nama;
  if (phoneEl) phoneEl.textContent = nohp;
  if (emailEl) emailEl.textContent = email;

  if(avatarEl){
    if(data.fotoProfil){
      avatarEl.innerHTML = `<img src="${data.fotoProfil}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatarEl.textContent = nama.charAt(0).toUpperCase();
    }
  }
}

// ===== LOCAL PHOTO =====
function loadLocalAvatar(){
  const savedPhoto = localStorage.getItem("profilePhoto");
  if(!savedPhoto) return;

  setProfileUI({
    nama: document.getElementById("profileName")?.textContent,
    fotoProfil: savedPhoto
  });
}

// ===== POPUP CLOSE =====
if (editPopup) {
  editPopup.onclick = (e) => {
    if (e.target === editPopup) editPopup.classList.remove("show");
  };
}

// ❌ DIHAPUS: inputPhoto handler (SUDAH DI INDEX.JS)

// ===== CONFIRM =====
safeOnClick("btnCancelConfirm", () => {
  confirmPopup?.classList.remove("show");
  pendingSave = false;
});

safeOnClick("btnCloseSuccess", () => {
  successPopup?.classList.remove("show");
});

safeOnClick("btnLogout", () => {
  pendingLogout = true;
  confirmPopup?.classList.add("show");
});

safeOnClick("btnOkConfirm", async () => {
  confirmPopup?.classList.remove("show");

  if (pendingLogout) {
    pendingLogout = false;
    await firebase.auth().signOut();
    window.location.href = "register.html";
  }
});

// ===== LOAD =====
window.addEventListener("load", () => {
  loadLocalAvatar();
});

// ===== NAVIGASI =====
safeOnClick("btnEditProfile", () => {
  const userData = {
    nama: document.getElementById("profileName")?.textContent,
    noHP: document.getElementById("profilePhone")?.textContent,
    photoURL: localStorage.getItem("profilePhoto")
  };
  PopupManager.showEditProfile(userData);
});

// ===== SAVE PROFILE (CLOUDINARY) =====
safeOnClick("btnSaveProfile", async () => {
  const userId = window.userId;
  if (!userId) return;

  const nama = document.getElementById("editNama").value.trim();
  const noHP = document.getElementById("editNoHP").value.trim();

  let tempPhoto = localStorage.getItem("tempProfilePhoto");

  console.log("TEMP PHOTO:", tempPhoto);

  // ⛔ JANGAN SAVE kalau upload belum selesai
  if(tempPhoto && !tempPhoto.startsWith("http") && tempPhoto !== "delete"){
    PopupManager.showCustom("Tunggu upload selesai ⏳");
    return;
  }

  try {
    const updateData = { nama, noHP };

    // ===== HANDLE FOTO =====
    if(tempPhoto === "delete"){
      updateData.fotoProfil = "";
      localStorage.removeItem("profilePhoto");
    }
    else if(tempPhoto && tempPhoto.startsWith("http")){
      updateData.fotoProfil = tempPhoto;
      localStorage.setItem("profilePhoto", tempPhoto);
    }

    console.log("DATA DIKIRIM:", updateData);

    await window.db.collection("users").doc(userId).update(updateData);

    localStorage.removeItem("tempProfilePhoto");

    setProfileUI(updateData);

    PopupManager.closeEditProfile();
    PopupManager.showCustom("Profil berhasil diperbarui");

  } catch(err){
    console.error("Error update profil:", err);
    PopupManager.showCustom("Gagal update profil 😔");
  }
});

// ===== NAV LAIN =====
safeOnClick("btnTerms", () => window.location.href = "ketentuan.html");
safeOnClick("btnPrivacy", () => window.location.href = "kebijakan.html");
safeOnClick("btnMitraToko", () => window.location.href = "mitratoko.html");
safeOnClick("btnFeedback", () => window.location.href = "feedback.html");
safeOnClick("btnTentang", () => window.location.href = "tentang.html");

safeOnClick("btnInvite", () => {
  const text = encodeURIComponent("Yuk pakai aplikasi SuruhBeli! 🚀");
  window.open(`https://wa.me/?text=${text}`, "_blank");
});