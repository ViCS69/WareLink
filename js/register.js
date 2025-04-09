import { auth, db } from "./firebaseConfig.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  if (!registerForm) {
    console.error("❌ Register form not found in DOM!");
    return;
  }
  registerForm.addEventListener("submit", handleRegister);
});

async function handleRegister(e) {
  e.preventDefault();

  const registerBtn = document.getElementById("register-btn");
  const spinner = document.getElementById("register-spinner");
  const text = document.getElementById("register-text");

  registerBtn.disabled = true;
  spinner.classList.remove("hidden");
  text.textContent = "Регистриране...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const businessName = document.getElementById("business-name").value;
  const eik = document.getElementById("eik").value;
  const zdds = document.getElementById("zdds").value || "";
  const mol = document.getElementById("mol").value;
  const address = document.getElementById("address").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await createUser(user, businessName, eik, zdds, mol, address);
    document.getElementById("register-btn").disabled = true;

    window.location.href = "loggedIn.html";
  } catch (error) {
    console.error("❌ Registration error:", error);
    alert(error.message);
    spinner.classList.add("hidden");
    text.textContent = "Регистрация";
    registerBtn.disabled = false;
  }
}

async function createUser(user, businessName, eik, zdds, mol, address) {
  const userRef = doc(db, "users", user.uid);

  try {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      businessName: businessName,
      eik: eik,
      zdds: zdds,
      mol: mol,
      address: address,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("❌ Firestore write error:", error.message);
    throw error;
  }
}

export { handleRegister };
