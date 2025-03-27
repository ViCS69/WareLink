import { auth, logout } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { db } from "./firebaseConfig.js";
import { collection, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { loadUserSettings, saveUserSettings } from "./settings.js";
import { upgradeToPremium } from "./subscriptions.js";

document.addEventListener("DOMContentLoaded", function () {
    const userEmailElement = document.getElementById("user-email");
    const logoutLink = document.getElementById("logout-link");
    const settingsBtn = document.getElementById("settings-btn");
    const storeList = document.getElementById("storeList");
    const searchInput = document.getElementById("searchStore");
    const noResults = document.getElementById("noResults");

    let allStores = [];

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        userEmailElement.textContent = `Влезли сте като ${user.email}`;
        userEmailElement.classList.remove("hidden");
        settingsBtn.classList.remove("hidden");
        logoutLink.classList.remove("hidden");

        searchInput.value = "";
        allStores = await fetchStores();
        updateStoreList(allStores);

        await updateSubscriptionUI(user.uid);
    });

    logoutLink.addEventListener("click", () => {
        logout();
        window.location.href = "index.html";
    });

    document.querySelectorAll("button[data-plan]").forEach(button => {
        button.addEventListener("click", async () => {
            const user = auth.currentUser;
            if (!user) {
                alert("❌ Трябва да сте влезли, за да надстроите абонамента.");
                return;
            }
            
            const plan = button.getAttribute("data-plan");
            await upgradeToPremium(user.uid, plan);
            updateSubscriptionUI(user.uid); 
        });
    });

    searchInput.addEventListener("input", (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredStores = allStores.filter(store =>
            store.storeName.toLowerCase().startsWith(searchTerm)
        );
        updateStoreList(filteredStores);
    });

    async function fetchStores() {
        try {
            const storesCollection = collection(db, "stores");
            const storeSnapshot = await getDocs(storesCollection);

            const stores = storeSnapshot.docs.map(doc => {
                const data = doc.data() || {};
                return {
                    storeId: doc.id,
                    storeName: data.storeName ?? "Unknown Store",
                    ownerId: data.ownerId ?? "Unknown Owner"
                };
            });

            stores.sort((a, b) => a.storeName.localeCompare(b.storeName));
            return stores;
        } catch (error) {
            console.error("❌ Error fetching stores:", error);
            return [];
        }
    }

    function updateStoreList(filteredStores) {
        storeList.innerHTML = "";

        if (filteredStores.length === 0) {
            noResults.style.display = "block";
            return;
        } else {
            noResults.style.display = "none";
        }

        filteredStores.slice(0, 7).forEach(store => {
            const li = document.createElement("li");
            li.innerHTML = `<a href="viewstore.html?id=${store.storeId}">${store.storeName}</a>`;
            storeList.appendChild(li);
        });
    }

    async function updateSubscriptionUI(userId) {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
    
        if (!userSnap.exists()) {
            return;
        }
    
        const userData = userSnap.data();
    
        const currentPlan = userData.subscription;
    
        document.querySelectorAll(".subscription-btn").forEach(button => {
            const plan = button.getAttribute("data-plan");
    
            if (plan === currentPlan) {
                button.textContent = "Сегашен план";
                button.disabled = true;
                button.classList.add("bg-gray-400", "text-gray-200", "cursor-not-allowed");
                button.classList.remove("bg-blue-600", "hover:bg-blue-700");
            } 
            else if (currentPlan) { 
                button.textContent = "Промени план";
                button.disabled = false;
                button.classList.add("bg-blue-600", "hover:bg-blue-700", "text-white");
                button.classList.remove("bg-gray-400", "text-gray-200", "cursor-not-allowed");
            }
            else {
                button.textContent = "Започни";
                button.disabled = false;
                button.classList.add("bg-blue-600", "hover:bg-blue-700", "text-white");
                button.classList.remove("bg-gray-400", "text-gray-200", "cursor-not-allowed");
            }
        });
    }
});
