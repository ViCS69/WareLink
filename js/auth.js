import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { app } from "./firebaseConfig.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  setDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const auth = getAuth(app);

async function logout() {
  await signOut(auth);
  localStorage.removeItem("userUID");
  window.location.reload();
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    localStorage.setItem("userUID", user.uid);
  } else {
    localStorage.removeItem("userUID");
  }
});

async function registerUser(user) {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    email: user.email,
    subscription: null,
    productLimit: 0,
  });
}

export { auth, logout };
