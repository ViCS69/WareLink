import { db } from "./firebaseConfig.js";
import { auth } from "./auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const settingsTab = document.getElementById("settings-tab");
const settingsBtn = document.getElementById("settings-btn");
const closeSettingsBtn = document.getElementById("close-settings");
const closeSettingsTopBtn = document.getElementById("close-settings-top");
const saveSettingsBtn = document.getElementById("save-settings");
const loadingIndicator = document.getElementById("settings-loading");

let originalSettings = {};
let loadingSettings = false;

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
  if (loadingSettings) return;
  loadingSettings = true;

  const user = auth.currentUser;
  if (!user) {
    console.error("❌ No logged-in user.");
    loadingSettings = false;
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const cacheKey = `user_${user.uid}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
  const maxAge = 1000 * 60 * 5;

  showLoading(true);

  if (cached && Date.now() - (cached.__timestamp || 0) < maxAge) {
    originalSettings = { ...cached };
    delete originalSettings.__timestamp;
    populateUI(originalSettings);
    showLoading(false);
    loadingSettings = false;
    return;
  }

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      originalSettings = { ...userData };
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ ...userData, __timestamp: Date.now() })
      );
      populateUI(userData);
    } else {
      console.warn("⚠️ No user settings found.");
    }
  } catch (error) {
    console.error("❌ Error fetching user settings:", error);
  } finally {
    showLoading(false);
    loadingSettings = false;
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
    eik: "eik",
    zdds: "zdds",
    mol: "mol",
    address: "address",
  };

  Object.keys(fieldMappings).forEach((fieldId) => {
    const input = document.getElementById(`${fieldId}-input`);
    if (input) {
      const key = fieldMappings[fieldId];
      const newValue = input.value.trim();
      if (originalSettings[key] !== newValue) {
        updatedData[key] = newValue;
      }
    }
  });

  if (Object.keys(updatedData).length === 0) {
    alert("⚠️ No saved changes.");
    return;
  }

  try {
    await updateDoc(userRef, updatedData);

    const newUserData = { ...originalSettings, ...updatedData };
    localStorage.setItem(
      `user_${user.uid}`,
      JSON.stringify({ ...newUserData, __timestamp: Date.now() })
    );

    settingsTab.classList.add("hidden");
    document.body.classList.remove("noscroll");
  } catch (error) {
    alert("⚠️ Error updating user settings:.");
  }
}

function populateUI(userData) {
  for (const [fieldId, labelText] of Object.entries({
    "business-name": "Име на бизнеса",
    eik: "ЕИК",
    zdds: "ЗДДС номер",
    mol: "МОЛ",
    address: "Адрес",
  })) {
    populateSettingsField(fieldId, userData[fieldMappings[fieldId]] || "Не е въведено", labelText);
  }
}

const fieldMappings = {
  "business-name": "businessName",
  eik: "eik",
  zdds: "zdds",
  mol: "mol",
  address: "address",
};

function populateSettingsField(fieldId, value, label) {
  const field = document.getElementById(fieldId);
  if (!field) {
    console.warn(`⚠️ Field ${fieldId} not found.`);
    return;
  }

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
