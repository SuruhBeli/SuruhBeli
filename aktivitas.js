/* ====== GLOBAL STATE ====== */
let activeTab = "aktif";
let unsubscribeOrders = null;
let currentOrders = [];
window.currentEditId = null;
window.badgeSeen = JSON.parse(localStorage.getItem("badgeSeen")) || {
  diproses: 0,
  riwayat: 0
};
function saveBadgeSeen() {
  localStorage.setItem("badgeSeen", JSON.stringify(window.badgeSeen));
}
window.loadOrders = loadOrders;
window.lastOrderStatus = {};

/* ====== INIT (Dipanggil dari index.js) ======= */
function initAktivitas() {
  if (!window.userId || !window.db) return; // pastikan login & db ready
  setupTabs();
  loadOrders();
  setTimeout(updateAktivitasBadge, 0);
}
window.initAktivitas = initAktivitas;
// BADGE //
function updateAktivitasBadge() {
  let navItem = document.querySelector('.nav-item[data-view="aktivitas"]');

  if (!navItem) {
    setTimeout(updateAktivitasBadge, 100);
    return;
  }

  let badge = navItem.querySelector(".nav-badge");

  // 🔥 cari order terbaru per kategori
  const latestDiproses = currentOrders
    .filter(o => o.status === "Diproses")
    .sort((a,b) => b.createdAt - a.createdAt)[0];

  const latestRiwayat = currentOrders
    .filter(o => o.status === "Selesai" || o.status === "Dibatalkan")
    .sort((a,b) => b.createdAt - a.createdAt)[0];

  // 🔥 bandingkan dengan waktu terakhir dilihat
  const showDiproses = latestDiproses &&
    latestDiproses.createdAt.getTime() > window.badgeSeen.diproses;

  const showRiwayat = latestRiwayat &&
    latestRiwayat.createdAt.getTime() > window.badgeSeen.riwayat;

  if (showDiproses || showRiwayat) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "nav-badge";
      navItem.appendChild(badge);
    }
  } else {
    badge?.remove();
  }
}
function triggerOrderNotification(order) {

  if (!window.OneSignal) return;

  let title = "Update Pesanan";
  let message = "";

  switch(order.status) {
    case "Diproses":
      message = `Pesanan kamu sedang diproses 🚀`;
      break;
    case "Selesai":
      message = `Pesanan kamu sudah selesai ✅`;
      break;
    case "Dibatalkan":
      message = `Pesanan dibatalkan ❌`;
      break;
    default:
      return; // status lain diabaikan
  }

  window.OneSignal.push(function() {
    window.OneSignal.showNotification({
      title: title,
      message: message
    });
  });

}
/* ====== TAB SETUP ====== */
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      activeTab = tab.dataset.tab;

      // 🔥 FIX SESUAI STRUKTUR STATUS
      if (activeTab === "diproses") {
        window.badgeSeen.diproses = Date.now();
        saveBadgeSeen();
      }
      
      if (activeTab === "riwayat") {
        window.badgeSeen.riwayat = Date.now();
        saveBadgeSeen();
      }

      // ❌ JANGAN ADA LOGIC DI "aktif"

      updateAktivitasBadge();
      renderOrders();
    });
  });
}

/* ======= LOAD ORDERS (REALTIME) ======= */
function loadOrders() {
  const container = document.getElementById("ordersContainer");
  const empty = document.getElementById("ordersEmpty");
  if (!container || !window.userId || !window.db) return;

  container.innerHTML = "Memuat pesanan...";
  empty.style.display = "none";

  // Stop listener lama
  if (unsubscribeOrders) {
    unsubscribeOrders();
    unsubscribeOrders = null;
  }

  const pageSize = 50;

  unsubscribeOrders = window.db.collection("orders")
    .where("userId", "==", window.userId)
    .orderBy("createdAt", "desc")
    .limit(pageSize)
  .onSnapshot(snapshot => {
    if (snapshot.metadata.hasPendingWrites) return;
    if (!snapshot.empty) {
  
      // 🔥 mapping SEKALI saja
      const newOrders = snapshot.docs.map(doc => {
        const data = doc.data();
      
        const order = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(0)
        };
      
        // 🔥 CEK PERUBAHAN STATUS
        const prevStatus = window.lastOrderStatus[order.id];
        const currentStatus = order.status;
      
        if (prevStatus && prevStatus !== currentStatus) {
          triggerOrderNotification(order);
        }
      
        // simpan status terbaru
        window.lastOrderStatus[order.id] = currentStatus;
      
        return order;
      });
  
      // 🔥 update state
      currentOrders = newOrders;
  
      // ✅ URUTAN BENAR (WAJIB)
      updateAktivitasBadge();
      requestAnimationFrame(renderOrders);
  
    } else {
  
      currentOrders = [];
  
      updateAktivitasBadge();
      renderOrders();
    }
  
  }, err => {
    console.error("Firestore listener error:", err);
    container.innerHTML = "Gagal memuat pesanan.";
  });
}

/* ====== RENDER ORDERS ====== */
function renderOrders() {
  const container = document.getElementById("ordersContainer");
  const empty = document.getElementById("ordersEmpty");
  if (!container || !empty) return;

  // Filter sesuai tab aktif
  const filtered = currentOrders.filter(o => o && o.status); // ✅ pastikan o tidak undefined
  const filteredByTab = filtered.filter(o => {
    if (activeTab === "aktif") return o.status === "Dibuat";
    if (activeTab === "diproses") return o.status === "Diproses";
    return o.status === "Selesai" || o.status === "Dibatalkan";
  });

  if (!filteredByTab.length) {
    container.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  const fragment = document.createDocumentFragment();

  filteredByTab.forEach(order => {
    if (!order) return; // tambahan safety
    let card = document.getElementById("order-" + order.id);
    if (!card) {
      card = renderOrderCard(order); // ✅ hanya passing order
      card.id = "order-" + order.id;
    } else {
      updateOrderCard(card, order); // update existing card
    }
    fragment.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}
/* ====== UPDATE CARD EXISTING ====== */
function updateOrderCard(card, order) {
  if (!card || !order) return;

  // Update konten utama
  const layananEl = card.querySelector(".order-content > div:nth-child(1) b");
  const pesananEl = card.querySelector(".order-content > div:nth-child(2)");
  const ongkirEl = card.querySelector(".order-content > div:nth-child(3)");
  const statusEl = card.querySelector(".order-content .status");
  const waktuEl = card.querySelector(".order-content > div:nth-child(5)");

  if (layananEl) layananEl.textContent = order.layanan || "-";
  if (pesananEl) pesananEl.textContent = "Pesanan: " + (order.pesanan || "-");
  if (ongkirEl) ongkirEl.textContent = "Ongkir: Rp " + (Number(order.ongkir || 0)).toLocaleString("id-ID");

  if (statusEl) {
    let statusClass = '';
    switch (order.status) {
      case 'Dibuat': statusClass = 'proses'; break;
      case 'Diproses': statusClass = 'diproses'; break;
      case 'Selesai': statusClass = 'selesai'; break;
      case 'Dibatalkan': statusClass = 'gagal'; break;
      default: statusClass = 'proses';
    }
    statusEl.className = "status " + statusClass;
    statusEl.textContent = order.status || "-";
  }

  if (waktuEl) {
    waktuEl.textContent = order.createdAt?.toLocaleString ? order.createdAt.toLocaleString("id-ID") : "-";
  }

  // Update tombol actions
  const actionsEl = card.querySelector(".order-actions");
  if (!actionsEl) return;

  const now = Date.now(); 
  const createdTime = order.createdAt?.getTime ? order.createdAt.getTime() : 0;
  const canCancel = order.status === 'Dibuat' && (now - createdTime < 10 * 60 * 1000);
  const canEdit = order.status === 'Dibuat' && (now - createdTime < 10 * 60 * 1000);
  const canChat = order.status === 'Diproses' && order.kurir;

  // Hanya rebuild actions
  actionsEl.innerHTML = `
    <div class="action-wrapper">
      <span class="action-label">Detail</span>
      <button class="action-btn btn-detail" onclick="showDetail('${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937v-2.523a2.5 2.5 0 0 0-.732-1.768L8.354 5.232A2.5 2.5 0 0 0 6.586 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h1.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4h3Z" clip-rule="evenodd" />
          <path d="M3 6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-3.586a1 1 0 0 0-.293-.707L7.293 6.293A1 1 0 0 0 6.586 6H3Z" />
        </svg>
      </button>
    </div>
    ${canEdit ? `
    <div class="action-wrapper">
      <span class="action-label">Edit</span>
      <button class="action-btn btn-edit" onclick="openEditPopup('${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>` : ''}
    ${canCancel ? `
    <div class="action-wrapper">
      <span class="action-label">Batalkan</span>
      <button class="action-btn btn-cancel" onclick="confirmCancel('${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>` : ''}
    ${canChat ? `
    <div class="action-wrapper">
      <span class="action-label">Chat Driver</span>
      <button class="action-btn btn-chat" onclick="chatDriver('${order.kurir}', '${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M8 2C4.262 2 1 4.57 1 8c0 1.86.98 3.486 2.455 4.566a3.472 3.472 0 0 1-.469 1.26.75.75 0 0 0 .713 1.14 6.961 6.961 0 0 0 3.06-1.06c.403.062.818.094 1.241.094 3.738 0 7-2.57 7-6s-3.262-6-7-6ZM5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>` : ''}
  `;
}
/* ====== RENDER CARD ====== */
function renderOrderCard(order) {
  if (!order) order = {}; // safety
  let statusClass = '';
  switch (order.status) {
    case 'Dibuat': statusClass = 'proses'; break;
    case 'Diproses': statusClass = 'diproses'; break;
    case 'Selesai': statusClass = 'selesai'; break;
    case 'Dibatalkan': statusClass = 'gagal'; break;
    default: statusClass = 'proses';
  }

  const now = Date.now(); 
  const createdTime = order.createdAt?.getTime ? order.createdAt.getTime() : 0;
  const canCancel = order.status === 'Dibuat' && (now - createdTime < 10 * 60 * 1000);
  const canEdit = order.status === 'Dibuat' && (now - createdTime < 10 * 60 * 1000);

  const card = document.createElement('div');
  card.className = 'order-card';

  /* ===== BUTTON DETAIL ===== */
  const detailBtn = `
    <div class="action-wrapper">
      <span class="action-label">Detail</span>
      <button class="action-btn btn-detail" onclick="showDetail('${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937v-2.523a2.5 2.5 0 0 0-.732-1.768L8.354 5.232A2.5 2.5 0 0 0 6.586 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h1.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V4h3Z" clip-rule="evenodd" />
          <path d="M3 6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-3.586a1 1 0 0 0-.293-.707L7.293 6.293A1 1 0 0 0 6.586 6H3Z" />
        </svg>
      </button>
    </div>
  `;

  /* ===== BUTTON EDIT ===== */
  const editBtn = canEdit ? `
    <div class="action-wrapper">
      <span class="action-label">Edit</span>
      <button class="action-btn btn-edit" onclick="openEditPopup('${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  ` : '';

  /* ===== BUTTON CANCEL ===== */
  const cancelBtn = canCancel ? `
    <div class="action-wrapper">
      <span class="action-label">Batalkan</span>
      <button class="action-btn btn-cancel" onclick="confirmCancel('${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  ` : '';

  /* ===== BUTTON CHAT ===== */
  const chatBtn = (order.status === 'Diproses' && order.kurir) ? `
    <div class="action-wrapper">
      <span class="action-label">Chat Driver</span>
      <button class="action-btn btn-chat" onclick="chatDriver('${order.kurir}', '${order.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="size-4">
          <path fill-rule="evenodd" d="M8 2C4.262 2 1 4.57 1 8c0 1.86.98 3.486 2.455 4.566a3.472 3.472 0 0 1-.469 1.26.75.75 0 0 0 .713 1.14 6.961 6.961 0 0 0 3.06-1.06c.403.062.818.094 1.241.094 3.738 0 7-2.57 7-6s-3.262-6-7-6ZM5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  ` : '';

  card.innerHTML = `
    <div class="order-content">
      <div><b>${order.layanan || '-'}</b></div>
      <div>Pesanan: ${order.pesanan || '-'}</div>
      <div>Ongkir: Rp ${Number(order.ongkir || 0).toLocaleString('id-ID')}</div>
      <div class="status ${statusClass}">${order.status || '-'}</div>
      <div style="font-size:12px; opacity:0.7;">
        ${order.createdAt?.toLocaleString ? order.createdAt.toLocaleString("id-ID") : '-'}
      </div>
    </div>
    <div class="order-actions">
      ${detailBtn}
      ${editBtn}
      ${cancelBtn}
      ${chatBtn}
    </div>
  `;

  return card;
}

/* ========================================
   STATUS BADGE
======================================== */

function getStatusBadge(status) {

  switch(status) {

    case "proses":
      return `<span class="status-badge badge-proses">Dibuat</span>`;

    case "diproses":
      return `<span class="status-badge badge-proses">Aktif</span>`;

    case "selesai":
      return `<span class="status-badge badge-selesai">Selesai</span>`;

    case "gagal":
    case "Dibatalkan":
      return `<span class="status-badge badge-gagal">Dibatalkan</span>`;

    default:
      return `<span class="status-badge">${status || "-"}</span>`;
  }

}
/* ====== DETAIL POPUP EFISIEN ====== */
let activeDetailListeners = {}; // untuk tiap popup terbuka

function showDetail(orderId) {
  const content = document.getElementById("popupContent");
  if (!content) return;

  // Ambil data dari cache untuk render instan
  let cachedOrder = currentOrders.find(o => o.id === orderId);
  if (cachedOrder) {
    renderDetailPopup(cachedOrder, content);
  } else {
    content.innerHTML = "Memuat struk...";
  }

  // buka popup
  openPopup("popupDetail");

  // stop listener lama kalau ada
  if (activeDetailListeners[orderId]) {
    activeDetailListeners[orderId](); // unsubscribe
    delete activeDetailListeners[orderId];
  }

  // setup realtime listener Firestore untuk order ini
  activeDetailListeners[orderId] = window.db
    .collection("orders")
    .doc(orderId)
    .onSnapshot(doc => {
      if (!doc.exists) {
        content.innerHTML = "Data tidak ditemukan.";
        return;
      }
      const updatedOrder = { id: doc.id, ...doc.data() };
      
      // update currentOrders agar kartu & popup sinkron
      const index = currentOrders.findIndex(o => o.id === orderId);
      if (index >= 0) currentOrders[index] = updatedOrder;
      else currentOrders.push(updatedOrder);

      // update popup dan card
      renderDetailPopup(updatedOrder, content);
      const cardEl = document.getElementById("order-" + orderId);
      if (cardEl) updateOrderCard(cardEl, updatedOrder);
    }, err => {
      console.error("Detail listener error:", err);
    });
}

function renderDetailPopup(order, contentEl) {
  const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(0);
  contentEl.innerHTML = `
    <div class="receipt-header">
      <img src="alert.png" class="receipt-logo">
      <div class="receipt-title">SuruhBeli</div>
      <div class="receipt-sub">Struk Pesanan Digital</div>
    </div>

    <div class="row"><span class="label">ID Pesanan</span><span class="value">#${order.id.slice(0,6)}</span></div>
    <div class="row"><span class="label">Waktu</span><span class="value">${createdAt.toLocaleString("id-ID")}</span></div>
    <div class="dash"></div>
    <div class="row"><span class="label">Layanan</span><span class="value">${order.layanan || "-"}</span></div>
    <div class="row"><span class="label">Pesanan</span><span class="value">${order.pesanan || "-"}</span></div>
    <div class="row"><span class="label">Beli di</span><span class="value">${order.beliDi || "-"}</span></div>
    <div class="row"><span class="label">Catatan</span><span class="value">${order.catatan || "-"}</span></div>
    <div class="dash"></div>
    <div class="row"><span class="label">Ongkir</span><span class="value">Rp ${order.ongkir?.toLocaleString("id-ID") || "0"}</span></div>
    <div class="row"><span class="label">Status</span><span class="value">${getStatusBadge(order.status)}</span></div>
    <div class="dash"></div>
    <div class="receipt-footer">Terima kasih telah menggunakan SuruhBeli</div>
  `;
}

function closeDetailPopup() {
  closePopup("popupDetail");

  // hentikan semua listener popup terbuka
  Object.keys(activeDetailListeners).forEach(orderId => {
    activeDetailListeners[orderId]();
    delete activeDetailListeners[orderId];
  });
}
/* ====== EDIT POPUP EFISIEN ====== */
let activeEditListeners = {}; // tracking listener tiap popup edit

function openEditPopup(orderId) {
  const pesananInput = document.getElementById("editPesanan");
  const catatanInput = document.getElementById("editCatatan");
  if (!pesananInput || !catatanInput) return;

  // Ambil data dari cache supaya popup instan
  let cachedOrder = currentOrders.find(o => o.id === orderId);
  if (cachedOrder) {
    pesananInput.value = cachedOrder.pesanan || "";
    catatanInput.value = cachedOrder.catatan || "";
  } else {
    pesananInput.value = "Memuat...";
    catatanInput.value = "";
  }

  openPopup("popupEdit");
  window.currentEditId = orderId;

  // Stop listener lama
  if (activeEditListeners[orderId]) {
    activeEditListeners[orderId]();
    delete activeEditListeners[orderId];
  }

  // Setup listener realtime Firestore untuk edit
  activeEditListeners[orderId] = window.db
    .collection("orders")
    .doc(orderId)
    .onSnapshot(doc => {
      if (!doc.exists) return;
      const updatedOrder = { id: doc.id, ...doc.data() };

      // update currentOrders & card
      const index = currentOrders.findIndex(o => o.id === orderId);
      if (index >= 0) currentOrders[index] = updatedOrder;
      else currentOrders.push(updatedOrder);

      const cardEl = document.getElementById("order-" + orderId);
      if (cardEl) updateOrderCard(cardEl, updatedOrder);

      // update popup inputs kecuali user lagi ketik
      if (document.activeElement !== pesananInput) pesananInput.value = updatedOrder.pesanan || "";
      if (document.activeElement !== catatanInput) catatanInput.value = updatedOrder.catatan || "";
    }, err => {
      console.error("Edit listener error:", err);
    });
}

function closeEditPopup() {
  closePopup("popupEdit");

  // Stop listener popup edit
  if (window.currentEditId && activeEditListeners[window.currentEditId]) {
    activeEditListeners[window.currentEditId]();
    delete activeEditListeners[window.currentEditId];
  }

  window.currentEditId = null;
}

async function saveEditOrder() {
  if (!window.currentEditId) return;

  const pesanan = document.getElementById("editPesanan").value.trim();
  const catatan = document.getElementById("editCatatan").value.trim();

  try {
    await window.db
      .collection("orders")
      .doc(window.currentEditId)
      .update({ pesanan, catatan });

    closeEditPopup();
    await showCustomPopup("Pesanan berhasil diperbarui!");
    
    // renderOrders() optional karena listener sudah update card
    // renderOrders();
  } catch (err) {
    console.error(err);
    await showCustomPopup("Gagal memperbarui pesanan!");
  }
}

/* ====== CUSTOM POPUP ALERT / CONFIRM ====== */
function showCustomPopup(message, isConfirm=false){

  return new Promise(resolve => {

    const msg = document.getElementById("popupAlertMessage");
    const sub = document.getElementById("popupAlertSub");

    const btnOk = document.getElementById("popupOk");
    const btnCancel = document.getElementById("popupCancel");

    msg.textContent = message;

    sub.textContent =
      isConfirm ?
      "Tindakan ini tidak bisa dibatalkan"
      : "";

    btnCancel.style.display =
      isConfirm ? "inline-block" : "none";

    openPopup("popupAlert");

    const cleanup = (result)=>{

      closePopup("popupAlert");

      btnOk.onclick = null;
      btnCancel.onclick = null;

      resolve(result);

    };

    btnOk.onclick = ()=> cleanup(true);
    btnCancel.onclick = ()=> cleanup(false);

  });

}
/* ====== CONFIRM CANCEL ORDER ====== */
async function confirmCancel(orderId){

  const yakin =
  await showCustomPopup(
    "Yakin ingin membatalkan pesanan?",
    true
  );

  if(!yakin) return;

  try{

    await window.db
    .collection("orders")
    .doc(orderId)
    .update({ status:"Dibatalkan" });

    await showCustomPopup(
      "Pesanan berhasil dibatalkan!"
    );

    renderOrders();

  }
  catch(err){

    console.error(err);

    await showCustomPopup(
      "Gagal membatalkan pesanan!"
    );

  }

}

/* ======= CHAT DRIVER (SPA VERSION) ======= */
async function chatDriver(kurirUid, orderId) {
  if (!window.currentUser) return;

  const roomsRef = db.collection('chatRooms');
  let roomId = null;

  // Tambahkan composite index di Firestore untuk query ini
  const snapshot = await roomsRef
    .where(`participants.${window.currentUser.uid}`, '==', true)
    .where(`participants.${kurirUid}`, '==', true)
    .limit(1) // cukup ambil 1
    .get();

  if (!snapshot.empty) {
    roomId = snapshot.docs[0].id;
  } else {
    // Buat room baru dengan participants
    const newRoom = await roomsRef.add({
      participants: {
        [window.currentUser.uid]: true,
        [kurirUid]: true
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    roomId = newRoom.id;
  }

  // 🔹 Dispatch SPA event seperti di chatlist.js
  window.dispatchEvent(new CustomEvent("goto-chatRoom", { 
    detail: { 
      roomId: roomId,
      participants: {
        [window.currentUser.uid]: true,
        [kurirUid]: true
      } 
    } 
  }));

  // 🔹 Pindah view SPA
  showView('chatRoom');
}