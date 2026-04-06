/* ========================= */
/* ONGKIR SYSTEM GLOBAL */
/* ========================= */
const orderInput = document.getElementById("orderText");
const locationPreview = document.getElementById("locationPreview");
const btnChangeLocation = document.getElementById("btnChangeLocation");

const previewLayanan = document.getElementById("previewLayanan");
const previewToko = document.getElementById("previewToko");
const previewPesanan = document.getElementById("previewPesanan");
const previewCatatan = document.getElementById("previewCatatan");

if(previewPesanan) previewPesanan.innerText = "-";
if(previewCatatan) previewCatatan.innerText = "-";

let selectedLocation = null;
let tokoLat = null;
let tokoLng = null;
let desaToko = null;

/* ========================= */
/* BUKA VIEW ORDER MERCHANT */
/* ========================= */
window.goOrderMerchant = async function(toko){
  let tokoId = null;
  if(typeof toko === "string"){
    tokoId = toko;
  }
  else if(typeof toko === "object" && toko !== null){
    tokoId = toko.id;
  }
  if(!tokoId){
    console.error("ID toko tidak valid:", toko);
    return;
  }
  document.querySelectorAll(".view")
    .forEach(v => v.classList.remove("active","zoom-in"));
  const view = document.getElementById("view-orderMerchant");
  if(view){
    view.classList.add("active","zoom-in");
    view.dataset.tokoId = tokoId;
  }
  toggleHomeHeader(false);
  toggleNavbarForOrder(true);
  await loadSemuaDesa();       // penting: tunggu desa selesai load
  loadMerchantHero(tokoId);
  loadDefaultHomeLocation();
};

/* ========================= */
/* LOAD HERO TOKO */
/* ========================= */
async function loadMerchantHero(tokoId){
  const hero = document.getElementById("merchantHero");
  const nama = document.getElementById("merchantName");
  const desc = document.getElementById("merchantDesc");
  const address = document.getElementById("merchantAddress");
  if(!hero) return;
  const defaultImg = "default.png";
  try{
    const doc = await db.collection("dataToko")
      .doc(tokoId)
      .get();
    let foto = defaultImg;
    if(doc.exists){
      const data = doc.data();
      tokoLat = data.lat || null;
      tokoLng = data.lng || null;
      if(data.tokoFotoBase64){
        foto = data.tokoFotoBase64;
      }
      if(nama) nama.innerText = data.tokoNama || "Toko";
      if(desc) desc.innerText = data.tokoDeskripsi || "Tidak ada deskripsi";
      if(address) address.innerText = data.tokoAlamat || "";
      if(previewToko){
        previewToko.innerText = data.tokoNama || "-";
      }
      if(previewLayanan){
        previewLayanan.innerText = data.tokoKategori || "-";
      }
      cariDesaTerdekatToko();
      hitungOngkirMerchant();
    }
    hero.style.backgroundImage = `url('${foto}')`;
  }catch(e){
    console.log("Gagal load toko", e);
    hero.style.backgroundImage = `url('${defaultImg}')`;
  }
}

/* ========================= */
/* LOAD SEMUA DESA */
/* ========================= */
async function loadSemuaDesa(){
  try{
    const snapshot = await db.collection("desa").get();
    daftarDesa = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if(data.lat && data.lng){
        daftarDesa.push({
          nama: data.nama || doc.id,
          lat: data.lat,
          lng: data.lng
        });
      }
    });
  }catch(e){
    console.log("Gagal load desa", e);
  }
}

/* ========================= */
/* HITUNG JARAK HAVERSINE */
/* ========================= */
function hitungJarak(lat1,lng1,lat2,lng2){
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ========================= */
/* CARI DESA TERDEKAT TOKO */
/* ========================= */
function cariDesaTerdekatToko(){
  if(!tokoLat || !tokoLng || !daftarDesa.length) return;
  let desaDenganJarak = daftarDesa.map(desa => ({
    ...desa,
    jarak: hitungJarak(tokoLat,tokoLng,desa.lat,desa.lng)
  }));
  desaDenganJarak.sort((a,b)=>a.jarak-b.jarak);
  desaToko = desaDenganJarak[0];
}

/* ========================= */
/* HITUNG ONGKIR */
/* ========================= */
function hitungOngkirMerchant(){
  if(!selectedLocation || !desaToko || !daftarDesa.length) return;
  let desaUserRanking = daftarDesa.map(desa => ({
    ...desa,
    jarak: hitungJarak(
      selectedLocation.lat,
      selectedLocation.lng,
      desa.lat,
      desa.lng
    )
  }));
  desaUserRanking.sort((a,b)=>a.jarak-b.jarak);
  let ranking =
    desaUserRanking.findIndex(
      d => d.nama === desaToko.nama
    ) + 1;
  ongkir = ranking ? 3000 + ((ranking-1)*3000) : 0;
  const previewOngkir =
    document.getElementById("previewOngkir");
  if(previewOngkir){
    previewOngkir.innerText =
      "Rp " + ongkir.toLocaleString("id-ID");
  }
}

/* ========================= */
/* LOAD LOKASI RUMAH */
/* ========================= */
async function loadDefaultHomeLocation(){
  if(!locationPreview) return;
  locationPreview.innerText = "📍 Memuat lokasi rumah...";
  try{
    const uid = firebase.auth().currentUser.uid;
    const doc = await db.collection("users")
      .doc(uid)
      .get();
    if(doc.exists){
      const data = doc.data();
      selectedLocation = {
        lat: data.lat,
        lng: data.lng
      };
      locationPreview.innerText = "📍 Rumah Saya";
      hitungOngkirMerchant();
    }
  }catch(e){
    locationPreview.innerText = "Lokasi rumah tidak ditemukan";
  }
}

/* ========================= */
/* GANTI LOKASI GPS */
/* ========================= */
if(btnChangeLocation){
  btnChangeLocation.onclick = function(){
    btnChangeLocation.innerText = "Mengambil GPS...";
    btnChangeLocation.classList.add("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        selectedLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        locationPreview.innerText = "📡 Lokasi Saya Sekarang";
        hitungOngkirMerchant();
        btnChangeLocation.innerText = "✓ Lokasi Diganti";
        setTimeout(()=>{
          btnChangeLocation.innerText = "Ganti Lokasi";
          btnChangeLocation.classList.remove("loading");
        },1200);
      },
      err => {
        btnChangeLocation.innerText = "GPS gagal";
        setTimeout(()=>{
          btnChangeLocation.innerText = "Ganti Lokasi";
          btnChangeLocation.classList.remove("loading");
        },1500);
      }
    );
  };
}

/* ========================= */
/* AUTO EXPAND TEXTAREA */
/* ========================= */
document.querySelectorAll(".auto-textarea").forEach(textarea => {
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  });
});

/* ========================= */
/* UPDATE PREVIEW PESANAN */
/* ========================= */
if(orderInput){
  orderInput.addEventListener("input", () => {
    if(previewPesanan){
      previewPesanan.innerText =
        orderInput.value.trim() || "-";
    }
  });
}
const noteInput = document.getElementById("orderNote");
if(noteInput){
  noteInput.addEventListener("input", () => {
    if(previewCatatan){
      previewCatatan.innerText =
        noteInput.value.trim() || "-";
    }
  });
}

/* ========================= */
/* WAKTU STRUK */
/* ========================= */
function setReceiptTime(){
  const el = document.getElementById("previewWaktu");
  if(!el) return;
  const now = new Date();
  el.innerText = now.toLocaleString("id-ID");
}
setReceiptTime();

/* ========================= */
/* KIRIM PESANAN */
/* ========================= */
document.getElementById("sendOrderBtn").onclick = async function(){
  const btn = this;
  const mainOrder = document.getElementById("orderText")?.value.trim();
  if(!mainOrder) return PopupManager.showCustom("Isi pesanan dulu 😊");
  const locationText = selectedLocation ? `Lat: ${selectedLocation.lat}, Lng: ${selectedLocation.lng}` : "-";
  const catatan = document.getElementById("orderNote")?.value || "";
  const tokoId = document.getElementById("view-orderMerchant")?.dataset.tokoId || null;
  // Ambil nama toko untuk field beliDi
  const namaToko = previewToko?.innerText || "Toko";
  if(!tokoId){
    return PopupManager.showCustom("Toko tidak valid, coba lagi");
  }
  // Konfirmasi sebelum submit
  PopupManager.showConfirm("Pastikan pesanan dan lokasi sudah benar 😊", async () => {
    try {
      btn.classList.add("loading");
      btn.innerText = "Mengirim...";
      // 🔹 Ambil data toko dari Firestore untuk field layanan
      let layanan = "-";
      try {
        const tokoDoc = await db.collection("dataToko").doc(tokoId).get();
        if(tokoDoc.exists){
          const data = tokoDoc.data();
          layanan = data.tokoKategori || "-";
        }
      } catch(err){
        console.warn("Gagal ambil kategori toko:", err);
      }
      const orderData = {
        userId: firebase.auth().currentUser?.uid || null,
        tokoId,
        beliDi: namaToko,
        layanan,
        pesanan: mainOrder,
        catatan,
        lat: selectedLocation?.lat || null,
        lng: selectedLocation?.lng || null,
        ongkir: ongkir,
        status: "Dibuat",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("orders").add(orderData);
      btn.innerText = "✓ Pesanan dikirim";
      setTimeout(()=>{
        // Reset tombol dan input
        btn.innerText = "Kirim Pesanan";
        btn.classList.remove("loading");
        document.getElementById("orderText").value = "";
        document.getElementById("orderNote").value = "";
        if(previewPesanan) previewPesanan.innerText = "-";
        if(previewCatatan) previewCatatan.innerText = "-";
        hitungOngkirMerchant();
        // Redirect ke view aktivitas (sama seperti di order.js)
        if(window.opener && window.opener.dispatchEvent){
          window.opener.dispatchEvent(new CustomEvent('goto-aktivitas'));
          window.close();
        } else if(window.location.pathname.endsWith('index.html')){
          window.dispatchEvent(new CustomEvent('goto-aktivitas'));
        } else {
          window.location.href = "index.html#aktivitas";
        }
      },1200);
    } catch(e) {
      console.error("Gagal kirim pesanan:", e);
      PopupManager.showCustom("Gagal kirim pesanan, coba lagi ya");
      btn.innerText = "Kirim Pesanan";
      btn.classList.remove("loading");
    }
  });
};