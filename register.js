const firebaseConfig = {
  apiKey: "AIzaSyByQl0BXZoSMzrULUNA6l7UVFQjXmvsdJE",
  authDomain: "suruhbeli-e8ae8.firebaseapp.com",
  projectId: "suruhbeli-e8ae8",
  storageBucket: "suruhbeli-e8ae8.firebasestorage.app",
  messagingSenderId: "5783247867",
  appId: "1:5783247867:web:8f57e09a7dc4565378c95e"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let latUser = 0;
let lngUser = 0;

const popup = document.getElementById("popup");
const popupText = document.getElementById("popupText");

// ======================
// LOTTIE
// ======================
let lottieAnim = lottie.loadAnimation({
  container: document.getElementById('lottieLoader'),
  renderer: 'svg',
  loop: true,
  autoplay: false,
  path: 'loading.json'
});

// ======================
// POPUP
// ======================
function showLoading(){
  popup.style.display = "flex";
  popupText.innerText = "Tunggu sebentar";
  lottieAnim.goToAndPlay(0, true);
  setTimeout(()=>{
      if(popup.style.display === "flex"){
        console.log("🔥 FORCE STOP LOADING");
        showError();
        hidePopup(1500);
      }
    }, 8000);
}

function showSuccess(){
  popup.style.display = "flex";
  popupText.innerText = "Berhasil";
  lottieAnim.stop();
}

function showError(){
  popup.style.display = "flex";
  popupText.innerText = "Gagal";
  lottieAnim.stop();
}

function hidePopup(delay = 1000){
  setTimeout(()=>{
    popup.style.display = "none";
    lottieAnim.stop();
  }, delay);
}

// ======================
// LOKASI
// ✅ FIX: Timeout diperkecil dari 10000 → 5000ms
//         Supaya tidak terasa stuck terlalu lama
// ======================
function getLokasiPromise(){
  return new Promise((resolve)=>{
    if(!navigator.geolocation){
      latUser = 0;
      lngUser = 0;
      resolve();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        latUser = pos.coords.latitude;
        lngUser = pos.coords.longitude;
        resolve();
      },
      ()=>{
        // Gagal/ditolak → tetap lanjut dengan koordinat 0
        latUser = 0;
        lngUser = 0;
        resolve();
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,      // ✅ FIX: dari 10000 → 5000
        maximumAge: 60000   // ✅ FIX: pakai cache lokasi max 1 menit biar lebih cepat
      }
    );
  });
}

// ======================
// EMAIL LOGIN / REGISTER
// ======================
async function confirmEmailAuth(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPass = document.getElementById("confirmPassword").value.trim();

  if(!email || !password){
    showError();
    hidePopup(1500);
    return;
  }

  if(password !== confirmPass){
    showError();
    hidePopup(1500);
    return;
  }

  closeConfirmPopup();

  try{
    showLoading();

    let userCredential;

    try{
      userCredential = await auth.signInWithEmailAndPassword(email, password);
    }catch(error){
      userCredential = await auth.createUserWithEmailAndPassword(email, password);
    }

    await getLokasiPromise();
    await simpanUserJikaBaru(userCredential.user);

  }catch(error){
    console.error(error);
    showError();
    hidePopup(1500);
  }
}

// ======================
// GOOGLE LOGIN (ANDROID NATIVE)
// ======================
function loginGoogle(){
  if (window.Android && Android.loginWithGoogle) {
    showLoading();
    try {
      Android.loginWithGoogle();
    } catch(e) {
      console.error(e);
      showError();
      hidePopup(1500);
    }
  } else {
    alert("Harap gunakan aplikasi");
  }
}

// ======================
// LOGIN SUCCESS FROM ANDROID
// ======================
window.onNativeLogin = async function(uid, email){

  console.log("🔥 LOGIN ANDROID:", uid, email);

  try{
    localStorage.setItem("realUid", uid);
    localStorage.setItem("realEmail", email);

    const [, doc] = await Promise.all([
      getLokasiPromise(),
      db.collection("users").doc(uid).get()
    ]);

    if(!doc.exists){
      await db.collection("users").doc(uid).set({
        nama: email || "User",
        email: email || "",
        lat: latUser,
        lng: lngUser,
        role: "user",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    showSuccess();

    setTimeout(()=>{
      window.location.href = "index.html";
    }, 800);

  }catch(err){
    console.error("LOGIN ERROR:", err);

    // 🔥 FORCE MASUK WALAU ERROR
    window.location.href = "index.html";
  }
};

// ======================
// ERROR FROM ANDROID
// ======================
window.onNativeLoginError = function(reason){
  console.error("❌ LOGIN ERROR:", reason);
  alert(reason);
  showError();
  hidePopup(1500);
};

// ======================
// SIMPAN USER (EMAIL)
// ======================
async function simpanUserJikaBaru(user){
  try{
    const userRef = db.collection("users").doc(user.uid);
    const doc = await userRef.get();

    if(!doc.exists){
      await userRef.set({
        nama: user.displayName || user.email || "User",
        email: user.email || "",
        lat: latUser,
        lng: lngUser,
        role: "user",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    showSuccess();

    setTimeout(()=>{
      window.location.href = "index.html";
    }, 900);

  }catch(err){
    console.error(err);
    showError();
    hidePopup(1500);
  }
}

// ======================
// KONFIRMASI PASSWORD
// ======================
function openConfirmPopup(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if(!email || !password){
    showError();
    hidePopup(1500);
    return;
  }

  document.getElementById("confirmPopup").style.display = "flex";
}

function closeConfirmPopup(){
  document.getElementById("confirmPopup").style.display = "none";
}