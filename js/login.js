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
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
        showError("❌ Моля, въведете имейл и парола!");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "loggedIn.html"; 
    } catch (error) {
        console.error("❌ Login error:", error);
        
        if (error.code === "auth/user-not-found") {
            showError("❌ Невалиден имейл или потребителят не съществува.");
        } else if (error.code === "auth/wrong-password") {
            showError("❌ Грешна парола. Опитайте отново.");
        } else {
            showError(`❌ ${error.message}`);
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
