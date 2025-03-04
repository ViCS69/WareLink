import { db } from "./firebaseConfig.js";
import { auth } from "./auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const settingsTab = document.getElementById("settings-tab");
const settingsBtn = document.getElementById("settings-btn");
const closeSettingsBtn = document.getElementById("close-settings");
const closeSettingsTopBtn = document.getElementById("close-settings-top");
const saveSettingsBtn = document.getElementById("save-settings");
const loadingIndicator = document.getElementById("settings-loading"); 

document.addEventListener("DOMContentLoaded", () => {
    if (settingsBtn) {
        settingsBtn.addEventListener("click", async () => {
            settingsTab.classList.remove("hidden");
            document.body.classList.add("noscroll");
            await loadUserSettings();
        });
    }

    function closeSettings() {
        settingsTab.classList.add("hidden");
        document.body.classList.remove("noscroll");
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener("click", closeSettings);
    }

    if (closeSettingsTopBtn) {
        closeSettingsTopBtn.addEventListener("click", closeSettings);
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener("click", async () => {
            await saveUserSettings();
        });
    }
});

async function loadUserSettings() {
    const user = auth.currentUser;
    if (!user) {
        console.error("❌ No logged-in user.");
        return;
    }

    const userRef = doc(db, "users", user.uid);
    showLoading(true);

    const cachedData = localStorage.getItem(`user_${user.uid}`);
    if (cachedData) {
        populateUI(JSON.parse(cachedData));
    }

    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            localStorage.setItem(`user_${user.uid}`, JSON.stringify(userData)); 
            populateUI(userData);
        } else {
            console.warn("⚠️ No user settings found.");
        }
    } catch (error) {
        console.error("❌ Error fetching user settings:", error);
    } finally {
        showLoading(false);
    }
}

async function saveUserSettings() {
    const user = auth.currentUser;
    if (!user) {
        console.error("❌ No logged-in user.");
        return;
    }

    const userRef = doc(db, "users", user.uid);
    const updatedData = {};
    const fieldMappings = {
        "business-name": "businessName",
        "eik": "eik",
        "zdds": "zdds",
        "mol": "mol",
        "address": "address"
    };

    Object.keys(fieldMappings).forEach((fieldId) => {
        const input = document.getElementById(`${fieldId}-input`);
        if (input) {
            updatedData[fieldMappings[fieldId]] = input.value;
        }
    });

    if (Object.keys(updatedData).length === 0) {
        alert("⚠️ Няма направени промени.");
        return;
    }

    try {
        await updateDoc(userRef, updatedData);
        localStorage.setItem(`user_${user.uid}`, JSON.stringify(updatedData)); 
        alert("✅ Настройките са запазени!");
        settingsTab.classList.add("hidden"); 
        document.body.classList.remove("noscroll");
    } catch (error) {
        console.error("❌ Error updating user settings:", error);
        alert("⚠️ Грешка при запазването на настройките.");
    }
}

function populateUI(userData) {
    populateSettingsField("business-name", userData.businessName || "Не е въведено");
    populateSettingsField("eik", userData.eik || "Не е въведено");
    populateSettingsField("zdds", userData.zdds || "Не е въведено");
    populateSettingsField("mol", userData.mol || "Не е въведено");
    populateSettingsField("address", userData.address || "Не е въведено");
}

function populateSettingsField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) {
        console.warn(`⚠️ Field ${fieldId} not found.`);
        return;
    }

    const labels = {
        "business-name": "Име на бизнеса",
        "eik": "ЕИК",
        "zdds": "ЗДДС номер",
        "mol": "МОЛ",
        "address": "Адрес",
    };

    const label = labels[fieldId] || fieldId;

    field.innerHTML = `
        <strong>${label}:</strong> 
        <span id="${fieldId}-text" class="text-gray-700">${value}</span>
        <span id="${fieldId}-edit" class="text-blue-500 text-sm cursor-pointer ml-2">[Редактирай]</span>
    `;

    document.getElementById(`${fieldId}-edit`).addEventListener("click", () => {
        field.innerHTML = `
            <strong>${label}:</strong> 
            <input type="text" id="${fieldId}-input" value="${value}" class="w-full border p-2 rounded">
        `;
        document.getElementById(`${fieldId}-input`).focus();
    });
}


function showLoading(isLoading) {
    if (loadingIndicator) {
        loadingIndicator.classList.toggle("hidden", !isLoading);
    }
}

export { loadUserSettings, saveUserSettings };
