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
// LOTTIE (WAJIB ADA)
// ======================
let lottieAnim = lottie.loadAnimation({
  container: document.getElementById('lottieLoader'),
  renderer: 'svg',
  loop: true,
  autoplay: false,
  path: 'loading.json' // pastikan file ini ADA
});
// ======================
// POPUP DEBUG VERSION
// ======================
function showLoading(msg = "Tunggu sebentar"){
  popup.style.display = "flex";
  popupText.innerText = msg;

  lottieAnim.goToAndPlay(0, true); // 🔥 START ANIMASI
}

function showSuccess(msg = "Berhasil"){
  popup.style.display = "flex";
  popupText.innerText = msg;

  lottieAnim.stop(); // optional: bisa diganti anim success
}

function showError(msg = "Gagal"){
  popup.style.display = "flex";
  popupText.innerText = msg;

  lottieAnim.stop();
  alert("❌ ERROR: " + msg);
}

function hidePopup(delay = 1000){
  setTimeout(()=>{
    popup.style.display = "none";
    lottieAnim.stop(); // 🔥 STOP BIAR RESET
  }, delay);
}

// ======================
// LOKASI
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
        latUser = 0;
        lngUser = 0;
        resolve();
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000
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
    showError("Email / Password kosong");
    return;
  }

  if(password !== confirmPass){
    showError("Password tidak sama");
    return;
  }

  closeConfirmPopup();

  try{
    showLoading("Login email...");

    let userCredential;

    try{
      userCredential = await auth.signInWithEmailAndPassword(email, password);
    }catch(error){
      userCredential = await auth.createUserWithEmailAndPassword(email, password);
    }

    await getLokasiPromise();
    await simpanUserJikaBaru(userCredential.user);

  }catch(error){
    showError(error.message);
  }
}

// ======================
// GOOGLE LOGIN (ANDROID)
// ======================
function loginGoogle(){
  if (window.Android && Android.loginWithGoogle) {
    showLoading("Membuka Google...");
    Android.loginWithGoogle();
  } else {
    showError("Harus dari aplikasi Android");
  }
}

// ======================
// 🔥 TERIMA TOKEN DARI ANDROID (FIX TOTAL)
// ======================
window.onNativeLogin = async function(idToken, email){

  console.log("🔥 TOKEN:", idToken);

  try{
    showLoading("Login Google...");

    // 🔥 LOGIN FIREBASE WEB PAKAI TOKEN
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    const result = await firebase.auth().signInWithCredential(credential);

    const user = result.user;

    console.log("🔥 LOGIN SUKSES:", user.uid);

    localStorage.setItem("realUid", user.uid);
    localStorage.setItem("realEmail", user.email);

    const [, doc] = await Promise.all([
      getLokasiPromise(),
      db.collection("users").doc(user.uid).get()
    ]);

    if(!doc.exists){
      await db.collection("users").doc(user.uid).set({
        nama: user.email || "User",
        email: user.email || "",
        lat: latUser,
        lng: lngUser,
        role: "user",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    showSuccess("Login berhasil");

    setTimeout(()=>{
      window.location.href = "index.html";
    }, 800);

  }catch(err){
    console.error(err);
    showError("Google login gagal: " + err.message);
  }
};

// ======================
// ERROR DARI ANDROID
// ======================
window.onNativeLoginError = function(reason){
  console.error("❌ NATIVE ERROR:", reason);
  showError(reason);
};

// ======================
// SIMPAN USER EMAIL
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

    showSuccess("Login berhasil");

    setTimeout(()=>{
      window.location.href = "index.html";
    }, 900);

  }catch(err){
    showError("Firestore gagal: " + err.message);
  }
}

// ======================
// UI
// ======================
function openConfirmPopup(){
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if(!email || !password){
    showError("Isi dulu email & password");
    return;
  }

  document.getElementById("confirmPopup").style.display = "flex";
}

function closeConfirmPopup(){
  document.getElementById("confirmPopup").style.display = "none";
}