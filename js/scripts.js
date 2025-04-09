import { addProduct, loadProducts } from "./productManager.js";
import {
  addCategory,
  loadCategories,
  checkIfCategoryExists,
  changeProductCategory,
  populateCategoryDropdown,
} from "./categoryManager.js";
import {
  query,
  collection,
  getDocs,
  where,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { db, storage } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {
  loadStoreLogo,
  handleLogoUpload,
  loadStoreName,
} from "./logoManager.js";
import { cleanProductName } from "./productManager.js";
window.addEventListener("unhandledrejection", (event) => {
  if (event.reason?.message?.includes("ERR_BLOCKED_BY_CLIENT")) {
    event.preventDefault();
  }
});

auth.onAuthStateChanged(async (user) => {
  if (user) {
    localStorage.setItem("userUID", user.uid);
    try {
      await loadStoreName();
      await loadCategories();
      await loadStoreLogo();
    } catch (error) {
      console.error("❌ Error loading data after auth:", error);
    }
  } else {
    localStorage.removeItem("userUID");
  }
});

async function checkIfProductExists(cleanedName) {
  const userUID = localStorage.getItem("userUID");
  const storeId = userUID;

  const q = query(
    collection(db, "products"),
    where("storeId", "==", storeId),
    where("nameCleaned", "==", cleanedName)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

document.addEventListener("DOMContentLoaded", async () => {
  initializeEventListeners();
  loadStoreLogo();
  let debounceTimer;
  const nameInput = document.getElementById("nameInput");
  const nameStatus = document.getElementById("nameStatus");
  const newProductFields = document.getElementById("newProductFields");

  nameInput.addEventListener("input", (e) => {
    const value = e.target.value.trim();

    clearTimeout(debounceTimer);

    if (value === "") {
      nameStatus.textContent = "";
      newProductFields.classList.add("hidden");
      return;
    }

    nameStatus.textContent = "Checking...";

    debounceTimer = setTimeout(async () => {
      const cleanedName = cleanProductName(value);
      const exists = await checkIfProductExists(cleanedName);

      if (exists) {
        nameStatus.textContent = "Product exists in your warehouse.";
        newProductFields.classList.add("hidden");
      } else {
        nameStatus.textContent = "New product. Please enter additional info.";
        newProductFields.classList.remove("hidden");
      }
    }, 1000);
  });

  const userUID = auth.currentUser?.uid;
  if (userUID) {
    try {
      await loadStoreName();
      await loadCategories();
    } catch (error) {
      console.error("❌ Error loading initial store data:", error);
    }
  }
});

function initializeEventListeners() {
  document
    .getElementById("logoUploader")
    ?.addEventListener("change", handleLogoUpload);
  document.getElementById("addItemBtn")?.addEventListener("click", () => {
    document.getElementById("uploadModal")?.classList.remove("hidden");
    document.getElementById("uploadModal")?.classList.add("flex");
  });

  document.getElementById("closeUploadModal")?.addEventListener("click", () => {
    document.getElementById("uploadModal")?.classList.add("hidden");
    document.getElementById("uploadModal")?.classList.remove("flex");
  });

  document.getElementById("add-category-btn")?.addEventListener("click", () => {
    document.getElementById("addCategoryModal").classList.remove("hidden");
  });

  document
    .getElementById("closeAddCategoryModal")
    ?.addEventListener("click", () => {
      document.getElementById("addCategoryModal").classList.add("hidden");
    });

  document
    .getElementById("addCategoryForm")
    ?.addEventListener("submit", async function (e) {
      e.preventDefault();
      const categoryName = document
        .getElementById("categoryNameInput")
        .value.trim();
      if (categoryName) {
        try {
          await addCategory(categoryName);
          this.reset();
          document.getElementById("addCategoryModal").classList.add("hidden");
        } catch (error) {
          console.error("❌ Error adding category:", error);
          alert(error.message);
        }
      }
    });

  document
    .getElementById("changeCategoryForm")
    ?.addEventListener("submit", async function (e) {
      e.preventDefault();

      const categorySelectDropdown = document.getElementById(
        "categorySelectDropdown"
      );
      const selectedCategory = categorySelectDropdown.value;
      const categoryModal = document.getElementById("categoryModal");
      const productId = categoryModal.dataset.productId;

      if (!selectedCategory || !productId) {
        alert("No category selected or product ID missing.");
        return;
      }

      try {
        await changeProductCategory(productId, selectedCategory);

        categoryModal.classList.add("hidden");

        await loadProducts();
      } catch (error) {
        alert("Error changing category.");
      }
    });

  document
    .getElementById("closeCategoryModal")
    ?.addEventListener("click", () => {
      document.getElementById("categoryModal")?.classList.add("hidden");
    });

  document
    .getElementById("productForm")
    ?.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = document.getElementById("nameInput").value.trim();
      const price = parseFloat(document.getElementById("priceInput").value);
      const category = document.getElementById("categorySelect").value;
      const productImage = document.getElementById("productImage").files[0];
      const submitBtn = document.getElementById("submitBtn");

      if (isNaN(price)) {
        throw new Error("Please enter a valid price.");
      }

      if (!name || !price || !category || !productImage) {
        alert("Fill all fields and add an image.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading...";

      try {
        await addProduct(name, price);
        this.reset();
        document.getElementById("uploadModal").classList.add("hidden");
      } catch (error) {
        console.error("❌ Error adding product:", error);
        alert(error.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
      }
    });

  document.addEventListener("click", (event) => {
    const openDropdown = document.querySelector(".dropdown-menu:not(.hidden)");
    const isThreeDotsButton = event.target.closest(".fas, .three-dots-icon");
    const isInsideDropdown = event.target.closest(".dropdown-menu");

    if (!isInsideDropdown && !isThreeDotsButton && openDropdown) {
      openDropdown.classList.add("hidden");
    }
  });

  document.querySelectorAll(".dropdown-menu").forEach((menu) => {
    menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });
}

window.showUploadIcon = function () {
  const uploadIcon = document.getElementById("uploadIcon");
  if (uploadIcon) {
    uploadIcon.style.opacity = "1";
  } else {
    console.error("❌ Element #uploadIcon not found.");
  }
};

window.hideUploadIcon = function () {
  const uploadIcon = document.getElementById("uploadIcon");
  if (uploadIcon) {
    uploadIcon.style.opacity = "0";
  } else {
    console.error("❌ Element #uploadIcon not found.");
  }
};
