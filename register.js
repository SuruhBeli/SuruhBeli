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
        enableHighAccuracy:true,
        timeout:10000,
        maximumAge:0
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
// 🔥 GOOGLE LOGIN (ANDROID NATIVE)
// ======================
function loginGoogle(){
  if (window.Android && Android.loginWithGoogle) {
    showLoading();
    Android.loginWithGoogle();
  } else {
    alert("Harap gunakan aplikasi untuk login Google");
  }
}

// ======================
// 🔥 TERIMA LOGIN DARI ANDROID
// ======================
window.onNativeLogin = async function(uid, email){

  console.log("🔥 LOGIN ANDROID:", uid, email);

  try{
    showLoading();

    await getLokasiPromise();

    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();

    if(!doc.exists){
      await userRef.set({
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
    }, 900);

  }catch(err){
    console.error("LOGIN ERROR:", err);
    showError();
    hidePopup(1500);
  }
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
// TEMA
// ======================
function loadTheme(){
  const savedTheme = localStorage.getItem("themeMode");
  if(savedTheme === "dark"){
    document.body.classList.add("dark-mode");
  }else{
    document.body.classList.remove("dark-mode");
  }
}

window.addEventListener("load", loadTheme);