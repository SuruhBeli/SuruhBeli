const firebaseConfig = {
  apiKey: "AIzaSyByQl0BXZoSMzrULUNA6l7UVFQjXmvsdJE",
  authDomain: "suruhbeli-e8ae8.firebaseapp.com",
  databaseURL: "https://suruhbeli-e8ae8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "suruhbeli-e8ae8",
  storageBucket: "suruhbeli-e8ae8.firebasestorage.app",
  messagingSenderId: "5783247867",
  appId: "1:5783247867:web:8f57e09a7dc4565378c95e",
  measurementId: "G-W68JP10CG9"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== DOMS =====
const submitBtn = document.getElementById('submitBtn');
submitBtn.disabled = true;
const form = document.getElementById('formMitraToko');
const popup = document.getElementById("popupKonfirmasi");
const okBtn = document.getElementById("okBtn");
const cancelBtn = document.getElementById("cancelBtn");
const fotoInput = document.getElementById("tokoFoto");
const previewFoto = document.getElementById("previewFoto");
const previewContainer = document.querySelector(".preview-container");
const uploadArea = document.getElementById("uploadArea");
const setujuCheckbox = document.getElementById("setujuSyarat");
const lihatSyarat = document.getElementById("lihatSyarat");
const popupSyarat = document.getElementById("popupSyarat");
const ambilLokasiBtn = document.getElementById("ambilLokasiBtn");
const kategoriDropdown = document.getElementById("kategoriDropdown");
const kategoriSelected = document.getElementById("kategoriSelected");
const kategoriOptions = document.getElementById("kategoriOptions");
const kategoriInput = document.getElementById("tokoKategori");
const tokoDeskripsiInput = document.getElementById("tokoDeskripsi");
const deskripsiCounter = document.getElementById("deskripsiCounter");

// ===== DROPDOWN KATEGORI ===== //
kategoriSelected.addEventListener("click",()=>{
  kategoriOptions.classList.toggle("show");
});
document.querySelectorAll(".dropdown-item").forEach(item=>{
  item.addEventListener("click",()=>{
    
    const text = item.innerText;
    const value = item.dataset.value;

    kategoriSelected.innerText = text;
    kategoriInput.value = value;

    kategoriOptions.classList.remove("show");

    cekFormLengkap();
  });
});

document.addEventListener("click",(e)=>{
  if(!kategoriDropdown.contains(e.target)){
    kategoriOptions.classList.remove("show");
  }
});

// ===== FLAG =====
let fotoBase64 = null;
let isSubmitting = false;

// ===== AUTH =====
firebase.auth().onAuthStateChanged(async user => {
  if(!user){
    window.location.href="register.html";
    return;
  }
  window.currentUser = {
    uid:user.uid,
    email:user.email,
    displayName:user.displayName || "User"
  };
  const bolehDaftar = await validasiLimitToko();
  if(!bolehDaftar){
    return;
  }
  submitBtn.disabled = false;
});

// ===== CEK DATA TOKO USER =====
async function cekLimitTokoUser(){
  const uid = window.currentUser.uid;
  const snapshot = await db.collection("dataToko")
  .where("uid","==",uid)
  .where("status","in",["pending","approved"])
  .get();
  let pendingAda = false;
  let totalAktif = 0;
  snapshot.forEach(doc=>{
    const status = doc.data().status;
    if(status === "pending"){
      pendingAda = true;
    }
    totalAktif++;
  });
  return {
    pendingAda,
    totalAktif
  };
}

// ===== VALIDASI LIMIT TOKO =====
async function validasiLimitToko(){
  const cek = await cekLimitTokoUser();
  if(cek.pendingAda){
    tampilkanLimitState("Pendaftaran toko kamu sedang diproses admin.");
    return false;
  }
  if(cek.totalAktif >= 2){
    tampilkanLimitState("Kamu sudah mencapai batas maksimal 2 toko.");
    return false;
  }
  return true;
}

// ===== TAMPILKAN STATE LIMIT =====
function tampilkanLimitState(pesan){
  submitBtn.disabled = true;
  showAlert(pesan);
  setTimeout(()=>{
    document.getElementById("formContainer").style.display="none";
    document.getElementById("limitTokoState").style.display="flex";
  },300);
}

// klik preview untuk upload foto
uploadArea.addEventListener("click", ()=>{
  fotoInput.click();
});

// ===== INPUT FOTO =====
fotoInput.addEventListener("change", async function(){
  const file = this.files[0];
  if(!file) return;
  fotoBase64 = await compressImage(file);
  previewFoto.src = fotoBase64;
  previewFoto.style.display = "block";
  previewContainer.querySelector(".preview-placeholder").style.display = "none";
  cekFormLengkap();
});

// ===== COMPRESS FOTO =====
function compressImage(file){
  return new Promise((resolve)=>{
    const reader = new FileReader();
    reader.onload = function(e){
      const img = new Image();
      img.src = e.target.result;
      img.onload = function(){
        const canvas = document.createElement("canvas");
        const maxWidth = 800;
        let width = img.width;
        let height = img.height;
        if(width > maxWidth){
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img,0,0,width,height);
        const compressed = canvas.toDataURL("image/jpeg",0.7);
        resolve(compressed);
      };
    };
    reader.readAsDataURL(file);
  });
}

// ===== AMBIL LOKASI =====
ambilLokasiBtn.addEventListener("click", ()=>{
  if(!navigator.geolocation){
    alert("Browser tidak mendukung lokasi");
    return;
  }
  const originalText = "📍 Ambil Lokasi Toko";
  ambilLokasiBtn.textContent="Mengambil lokasi...";
  ambilLokasiBtn.disabled=true;
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    document.getElementById("tokoLat").value = lat;
    document.getElementById("tokoLng").value = lng;
    cekFormLengkap();
    ambilLokasiBtn.classList.add("success");
    ambilLokasiBtn.textContent="Lokasi berhasil";
    setTimeout(()=>{
      ambilLokasiBtn.textContent = originalText;
      ambilLokasiBtn.disabled=false;
    },1000);
  },()=>{
    ambilLokasiBtn.textContent="Gagal ambil lokasi";
    ambilLokasiBtn.disabled=false;
  });
});

// ===== SYARAT =====
lihatSyarat.addEventListener("click", ()=>{
  popupSyarat.style.display="flex";
});
function tutupSyarat(){
  popupSyarat.style.display="none";
}

// ===== CEK FORM =====
function cekFormLengkap(){
  const tokoNama = document.getElementById('tokoNama').value.trim();
  const tokoDeskripsi = document.getElementById('tokoDeskripsi').value.trim();
  const tokoAlamat = document.getElementById('tokoAlamat').value.trim();
  const tokoKategori = document.getElementById('tokoKategori').value.trim();
  const pemilikNama = document.getElementById('pemilikNama').value.trim();
  const pemilikHp = document.getElementById('pemilikHp').value.trim();
  const lat = document.getElementById('tokoLat').value;
  const lng = document.getElementById('tokoLng').value;
  if(
    tokoNama &&
    tokoDeskripsi &&
    tokoAlamat &&
    tokoKategori &&
    pemilikNama &&
    pemilikHp &&
    lat &&
    lng &&
    fotoBase64 &&
    setujuCheckbox.checked
  ){
    submitBtn.disabled = false;
  }else{
    submitBtn.disabled = true;
  }

}
document.querySelectorAll("#formMitraToko input, #formMitraToko textarea")
.forEach(input=>{
  input.addEventListener("input", cekFormLengkap);
});
setujuCheckbox.addEventListener("change", cekFormLengkap);

// ===== BATAS DESKRIPSI 70 KARAKTER =====
tokoDeskripsiInput.addEventListener("input", function(){
  if(this.value.length > 70){
    this.value = this.value.substring(0,70);
  }
  const jumlah = this.value.length;
  deskripsiCounter.textContent = jumlah + " / 70";
});

// ===== SUBMIT =====
okBtn.addEventListener("click", async ()=>{
  if(isSubmitting) return;
  isSubmitting = true;
  popup.style.display="none";
  if(!window.currentUser) return;
  document.getElementById("loadingOverlay").style.display="flex";
  submitBtn.disabled=true;
  const bolehDaftar = await validasiLimitToko();
  if(!bolehDaftar){
    document.getElementById("loadingOverlay").style.display="none";
    isSubmitting = false;
    return;
  }
  const data={
    tokoNama:document.getElementById('tokoNama').value.trim(),
    tokoDeskripsi:document.getElementById('tokoDeskripsi').value.trim(),
    tokoAlamat:document.getElementById('tokoAlamat').value.trim(),
    tokoKategori:document.getElementById('tokoKategori').value.trim(),
    pemilikNama:document.getElementById('pemilikNama').value.trim(),
    pemilikHp:document.getElementById('pemilikHp').value.trim(),
    lat:document.getElementById('tokoLat').value,
    lng:document.getElementById('tokoLng').value,
    uid:window.currentUser.uid,
    status:"pending",
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  try{
    if(fotoBase64){
      data.tokoFotoBase64 = fotoBase64;
    }
    await db.collection('dataToko').add(data);
    document.getElementById("loadingOverlay").style.display="none";
    showAlert("Berhasil daftar, tunggu persetujuan Admin");
    form.reset();
    previewContainer.style.display="none";
    fotoBase64=null;
  }catch(err){
    document.getElementById("loadingOverlay").style.display="none";
    showAlert("Gagal mendaftar toko");
    console.error(err);
  }
  submitBtn.disabled=false;
  isSubmitting = false;
  setTimeout(()=>{
   location.reload();
  },1500);
});
form.addEventListener('submit', e=>{
  e.preventDefault();
  popup.style.display="flex";
});
cancelBtn.addEventListener("click", ()=>{
  popup.style.display="none";
});

// ===== ALERT =====
function showAlert(msg){

  const popup = document.getElementById("popupAlert");
  const text = document.getElementById("alertText");
  text.innerText = msg;
  popup.style.display = "flex";
  setTimeout(()=>{
    popup.style.display = "none";
  },1500);
}
function closeAlert(){
  document.getElementById("popupAlert").style.display="none";
}