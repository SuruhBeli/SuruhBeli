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

  if(!email || !password){
    showError();
    hidePopup(1500);
    return;
  }

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
// 🔥 GOOGLE LOGIN (FIX)
// ======================
function loginGoogle(){
  showLoading();

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  auth.signInWithRedirect(provider);
}

// ======================
// 🔥 HANDLE REDIRECT (WAJIB)
// ======================
auth.getRedirectResult().then(async (result)=>{
  if(result.user){

    console.log("LOGIN GOOGLE:", result.user);

    showLoading();

    await getLokasiPromise();

    const userRef = db.collection("users").doc(result.user.uid);
    const doc = await userRef.get();

    if(!doc.exists){
      await userRef.set({
        nama: result.user.displayName || result.user.email || "User",
        email: result.user.email || "",
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
  }
}).catch((error)=>{
  console.error("GOOGLE ERROR:", error);
  showError();
  hidePopup(1500);
});

// ======================
// SIMPAN USER
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