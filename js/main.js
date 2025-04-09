import { logout, auth } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

window.logout = logout;

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "loggedIn.html";
  }
});
