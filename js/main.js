import { db } from "./firebaseConfig.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { logout, auth } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

window.logout = logout;

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("🎯 User detected:", user.email);
        window.location.href = "loggedIn.html"; 
    }
});

function viewStore(storeId) {
    console.log("🔍 Redirecting to store:", storeId);
    window.location.href = `store.html?id=${storeId}`;
}
