import { addProduct, loadProducts } from "./productManager.js";
import { addCategory, loadCategories, checkIfCategoryExists, changeProductCategory, populateCategoryDropdown } from "./categoryManager.js";
import { query, collection, getDocs, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { db, storage } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import { loadStoreLogo, handleLogoUpload, loadStoreName } from "./logoManager.js";

window.addEventListener("unhandledrejection", (event) => {
    if (event.reason?.message?.includes("ERR_BLOCKED_BY_CLIENT")) {
        event.preventDefault(); 
    }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("✅ User authenticated:", user.uid);
        localStorage.setItem("userUID", user.uid);
        try {
            await loadStoreName();
            await loadCategories();
            await loadStoreLogo();
        } catch (error) {
            console.error("❌ Error loading data after auth:", error);
        }
    } else {
        console.log("❌ User signed out");
        localStorage.removeItem("userUID");
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ DOM loaded, initializing...");

    initializeEventListeners();
    loadStoreLogo();

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
    console.log("✅ Initializing event listeners...");
    
    document.getElementById("logoUploader")?.addEventListener("change", handleLogoUpload);
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

    document.getElementById("closeAddCategoryModal")?.addEventListener("click", () => {
        document.getElementById("addCategoryModal").classList.add("hidden");
    });

    document.getElementById("addCategoryForm")?.addEventListener("submit", async function (e) {
        e.preventDefault();
        const categoryName = document.getElementById("categoryNameInput").value.trim();
        if (categoryName) {
            try {
                await addCategory(categoryName);
                console.log("✅ Category added successfully!");
                this.reset();
                document.getElementById("addCategoryModal").classList.add("hidden");
            } catch (error) {
                console.error("❌ Error adding category:", error);
                alert(error.message);
            }
        }
    });

    document.getElementById("changeCategoryForm")?.addEventListener("submit", async function (e) {
        e.preventDefault();
        
        const categorySelectDropdown = document.getElementById("categorySelectDropdown");
        const selectedCategory = categorySelectDropdown.value;
        const categoryModal = document.getElementById("categoryModal");
        const productId = categoryModal.dataset.productId;
    
        console.log("🚀 Attempting to change category...");
        console.log("Selected Category:", selectedCategory);
        console.log("Product ID:", productId);
    
        if (!selectedCategory || !productId) {
            console.error("❌ No category selected or product ID missing.");
            alert("Моля, изберете категория.");
            return;
        }
    
        try {
            await changeProductCategory(productId, selectedCategory);
            console.log("✅ Category changed successfully!");
    
            // Close the modal after updating
            categoryModal.classList.add("hidden");
    
            // Reload products to reflect the change
            await loadProducts();
        } catch (error) {
            console.error("❌ Error changing category:", error);
            alert("Грешка при промяна на категорията.");
        }
    });

    document.getElementById("closeCategoryModal")?.addEventListener("click", () => {
        document.getElementById("categoryModal")?.classList.add("hidden");
    });

    document.getElementById("productForm")?.addEventListener("submit", async function (e) {
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
            alert("Моля, попълнете всички полета и изберете изображение.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Качване...";

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

    // 🔽 Fix dropdown menu toggle issue 🔽
    document.addEventListener("click", (event) => {
        const openDropdown = document.querySelector(".dropdown-menu:not(.hidden)");
        const isThreeDotsButton = event.target.closest(".fas, .three-dots-icon");
        const isInsideDropdown = event.target.closest(".dropdown-menu");

        if (!isInsideDropdown && !isThreeDotsButton && openDropdown) {
            openDropdown.classList.add("hidden");
        }
    });

    // Ensure dropdown menu click doesn’t close immediately
    document.querySelectorAll(".dropdown-menu").forEach(menu => {
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
