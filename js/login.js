import { auth } from "./firebaseConfig.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
});
async function handleLogin(e) {
  e.preventDefault();
  const loginBtn = document.getElementById("login-btn");
  loginBtn.disabled = true;
  const spinner = document.getElementById("login-spinner");
  const loginText = document.getElementById("login-text");

  spinner.classList.remove("hidden");
  loginText.textContent = "Logging in...";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    showError("Please enter email and password");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "loggedIn.html";
  } catch (error) {
    console.error("Login error:", error);
    
    spinner.classList.add("hidden");
    loginText.textContent = "Login";
    loginBtn.disabled = false;

    if (error.code === "auth/user-not-found") {
      showError("Invalid email.");
    } else if (error.code === "auth/wrong-password") {
      showError("Wrong password. Try again.");
    } else {
      showError(`${error.message}`);
    }
  }
}

function showError(message) {
  let errorBox = document.getElementById("login-error");
  if (!errorBox) {
    errorBox = document.createElement("p");
    errorBox.id = "login-error";
    errorBox.className = "text-red-500 text-center mt-3";
    document.getElementById("login-form").appendChild(errorBox);
  }
  errorBox.textContent = message;
}
