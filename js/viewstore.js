import { db } from "./firebaseConfig.js";
import { doc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { loadCategories } from "./categoryManager.js";
import { loadProducts } from "./productManager.js";

const params = new URLSearchParams(window.location.search);
const storeId = params.get("id");

async function loadStore() {
    const storeNameElement = document.getElementById("storeName");
    const storeLogoElement = document.getElementById("storeLogo");

    if (!storeId) {
        storeNameElement.innerText = "❌ Store ID is missing!";
        return;
    }

    try {
        const storeRef = doc(db, "stores", storeId);
        const storeSnap = await getDoc(storeRef);

        if (storeSnap.exists()) {
            const storeData = storeSnap.data();
            storeNameElement.innerText = storeData.storeName;
            storeLogoElement.src = storeData.logoUrl || "default-logo.png";
        } else {
            storeNameElement.innerText = "❌ Store not found!";
        }
    } catch (error) {
        console.error("❌ Error fetching store:", error);
        storeNameElement.innerText = "⚠️ Error loading store.";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadStore();
    await loadCategories(storeId);
    await loadProducts(null, storeId); 
});
