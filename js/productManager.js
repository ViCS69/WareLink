import { db, storage } from "./firebaseConfig.js";
import { collection, doc, addDoc, query, where, getDocs, deleteDoc, getDoc, updateDoc, increment, orderBy, writeBatch } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";
import { compressImage } from "./logoManager.js";
import { changeProductCategory, getCategoriesForStore, populateCategoryDropdown } from "./categoryManager.js";
import { addToCart } from "./cartManager.js";

async function addProduct(name, price) {
    const userUID = localStorage.getItem("userUID");
    const category = document.getElementById("categorySelect").value;
    const productImage = document.getElementById("productImage").files[0];
    
    if (!userUID || !category || !productImage) {
        throw new Error("Моля, попълнете всички полета и изберете изображение.");
    }

    try {
        const storeId = await getStoreId(userUID);
        const imageUrl = await uploadProductImage(storeId, productImage);
        
        const productData = {
            storeId,
            category,
            name: name.trim(),
            price: parseFloat(price),
            imageUrl,
            createdAt: new Date()
        };

        const productId = await getNextProductId(storeId);
        productData.productId = productId;

        productData.position = await getNextProductPosition(storeId);

        await addDoc(collection(db, "products"), productData);
        
        await loadProducts(null, productData.storeId);
        
    } catch (error) {
        console.error("Error adding product:", error);
        throw error;
    }
}

async function getNextProductId(storeId) {
    const storeRef = doc(db, "stores", storeId);
    await updateDoc(storeRef, { productCounter: increment(1) });
    const storeSnap = await getDoc(storeRef);
    return storeSnap.data().productCounter;
}

async function getNextProductPosition(storeId) {
    const productsQuery = query(collection(db, "products"), where("storeId", "==", storeId), orderBy("position", "desc"));
    const productsSnapshot = await getDocs(productsQuery);
    if (productsSnapshot.empty) {
        return 1;
    }
    const highestPosition = productsSnapshot.docs[0].data().position;
    return highestPosition + 1;
}

async function getStoreId(userUID) {
    
    const storeQuery = query(collection(db, "stores"), where("ownerId", "==", userUID));
    const storeSnapshot = await getDocs(storeQuery);
    
    if (storeSnapshot.empty) {
        console.error("No store found for user:", userUID);
        throw new Error("Не е намерен магазин за този потребител!");
    }
    const storeId = storeSnapshot.docs[0].id;
    return storeId;
}

async function uploadProductImage(storeId, file) {
    try {
        const compressedFile = await compressImage(file, 384, 150);
        const fileName = `${Date.now()}_${compressedFile.name}`;
        const storageRef = ref(storage, `stores/${storeId}/products/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);
        return new Promise((resolve, reject) => {
            uploadTask.on("state_changed",
                (snapshot) => {},
                (error) => {
                    console.error("Upload failed:", error);
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
}

async function deleteProduct(productId) {
    try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
            console.error("Product not found:", productId);
            return;
        }
        
        const productData = productSnap.data();
        if (productData.imageUrl) {
            const imageRef = ref(storage, productData.imageUrl);
            await deleteObject(imageRef);
        }
        
        await deleteDoc(productRef);
    } catch (error) {
        console.error("Error deleting product:", error);
    }
}

let isInitialLoad = true;
async function loadProducts(category = null, storeId = null) {
    let queryStoreId = storeId;

    if (!storeId) {
        const userUID = localStorage.getItem("userUID");
        if (!userUID) {
            console.warn("No user logged in.");
            return;
        }

        const storeQuery = query(collection(db, "stores"), where("ownerId", "==", userUID));
        const storeSnapshot = await getDocs(storeQuery);
        if (storeSnapshot.empty) {
            console.warn("No store found for the user.");
            return;
        }
        queryStoreId = storeSnapshot.docs[0].id;
    }
    try {
        let productQuery = query(collection(db, "products"), where("storeId", "==", queryStoreId), orderBy("position", "asc"));
        if (category) {
            productQuery = query(productQuery, where("category", "==", category));
        }
        const productSnapshot = await getDocs(productQuery);
        const itemsContainer = document.getElementById("itemsContainer");
        if (!itemsContainer) {
            console.error("❌ 'itemsContainer' not found in DOM.");
            return;
        }
        itemsContainer.innerHTML = "";
        if (productSnapshot.empty) {
            itemsContainer.innerHTML = `<p class="text-gray-500">No products found</p>`;
            return;
        }
        productSnapshot.forEach((doc) => {
            const product = doc.data();
            product.id = doc.id; 
            displayProduct(product); 
        });
        
    } catch (error) {
        console.error("❌ Error loading products:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    const closeCategoryModal = document.getElementById("closeCategoryModal");
    const saveCategoryBtn = document.getElementById("saveCategoryBtn");
    const stopMovingModeBtn = document.getElementById("stopMovingModeBtn");

    if (closeCategoryModal) {
        closeCategoryModal.addEventListener("click", () => {
            document.getElementById("categoryModal").classList.add("hidden");
        });
    }

    if (saveCategoryBtn) {
        saveCategoryBtn.addEventListener("click", async (event) => {
            event.preventDefault();

            const categoryModal = document.getElementById("categoryModal");
            const categorySelectDropdown = document.getElementById("categorySelectDropdown");
            const selectedCategory = categorySelectDropdown?.value;
            const productId = categoryModal?.dataset?.productId;

            if (!selectedCategory || !productId) {
                console.error("❌ No category selected or product ID missing.");
                alert("Моля, изберете категория.");
                return;
            }

            try {
                await changeProductCategory(productId, selectedCategory);

                categoryModal.classList.add("hidden");

                await loadProducts();

                alert(`Категорията е променена на "${selectedCategory}"`);
            } catch (error) {
                console.error("❌ Error changing category:", error);
                alert("Грешка при промяна на категорията.");
            }
        });
    }

    if (stopMovingModeBtn) {
        stopMovingModeBtn.addEventListener("click", () => {
            toggleMovingMode(false);
        });
    }
}


function displayProduct(product) {
    const itemsContainer = document.getElementById("itemsContainer");
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("product-item", "bg-white", "shadow-md", "rounded", "p-4", "text-center", "flex", "flex-col", "gap-2", "relative", "hover:bg-gray-100", "hover:outline", "hover:outline-2", "hover:outline-gray-300", "hover:outline-offset-0", "transition-colors", "focus:outline-none", "transition-transform", "duration-300");
    itemDiv.draggable = true;
    itemDiv.dataset.productId = product.id;

    const imageContainer = document.createElement("div");
    imageContainer.classList.add("flex-1", "overflow-hidden");
    if (product.imageUrl) {
        const img = document.createElement("img");
        img.src = product.imageUrl;
        img.alt = product.name;
        img.classList.add("w-4/5", "h-48", "mx-auto", "object-contain", "rounded");
        imageContainer.appendChild(img);
    }

    const text = document.createElement("p");
    text.classList.add("text-lg", "font-semibold", "mt-2", "text-gray-800");
    text.textContent = `${product.name} - ${product.price.toFixed(2)}лв.`;

    const isStorePage = document.getElementById("storePage") !== null;
    if (isStorePage) {
        const settingsMenu = document.createElement("div");
        settingsMenu.classList.add("relative");

        const threeDotsIcon = document.createElement("button");
        threeDotsIcon.classList.add("three-dots-icon", "absolute", "top-2", "right-2", "text-gray-500", "hover:text-gray-700", "p-2");
        threeDotsIcon.innerHTML = "<i class='fas fa-ellipsis-v'></i>";

        const dropdownMenu = document.createElement("div");
        dropdownMenu.classList.add("dropdown-menu", "absolute", "right-0", "mt-2", "w-48", "bg-white", "border", "rounded", "shadow-lg", "transition-opacity", "duration-300");
        dropdownMenu.style.display = "none"; 

        const deleteOption = document.createElement("a");
        deleteOption.href = "#";
        deleteOption.classList.add("block", "px-4", "py-2", "text-gray-800", "hover:bg-gray-200");
        deleteOption.textContent = "🗑 Delete product";

        const changeCategoryOption = document.createElement("a");
        changeCategoryOption.href = "#";
        changeCategoryOption.classList.add("block", "px-4", "py-2", "text-gray-800", "hover:bg-gray-200");
        changeCategoryOption.textContent = "✎ Change category";

        const changeProductPlace = document.createElement("a");
        changeProductPlace.href = "#";
        changeProductPlace.classList.add("block", "px-4", "py-2", "text-gray-800", "hover:bg-gray-200");
        changeProductPlace.textContent = "Change Product Place";

        dropdownMenu.appendChild(deleteOption);
        dropdownMenu.appendChild(changeCategoryOption);
        dropdownMenu.appendChild(changeProductPlace);

        settingsMenu.appendChild(threeDotsIcon);
        settingsMenu.appendChild(dropdownMenu);
        itemDiv.appendChild(settingsMenu);

        function toggleDropdown() {
            const isVisible = dropdownMenu.style.display === "block";
            
            document.querySelectorAll(".dropdown-menu").forEach(menu => {
                menu.style.display = "none";
            });

            dropdownMenu.style.display = isVisible ? "none" : "block";
        }

        threeDotsIcon.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleDropdown();
        });

        document.addEventListener("click", (event) => {
            if (!settingsMenu.contains(event.target)) {
                dropdownMenu.style.display = "none";
            }
        });

        deleteOption.addEventListener("click", async (event) => {
            event.preventDefault();
            await deleteProduct(product.id);
            itemDiv.remove();
        });

        changeCategoryOption.addEventListener("click", async (event) => {
            event.preventDefault();
        
            const categoryModal = document.getElementById("categoryModal");
        
            categoryModal.dataset.productId = product.id;
        
            document.getElementById("categoryModalTitle").textContent = "Промяна на категорията";
        
            await populateCategoryDropdown();
            categoryModal.classList.remove("hidden");
        });

        changeProductPlace.addEventListener("click", (event) => {
            event.preventDefault();
            toggleMovingMode(true, changeProductPlace);
        });
    }

    itemDiv.appendChild(imageContainer);
    itemDiv.appendChild(text);
    itemsContainer.appendChild(itemDiv);

    const addToCartBtn = document.createElement("button");
    addToCartBtn.textContent = "🛒 Add to Cart";
    addToCartBtn.classList.add("mt-auto", "bg-blue-500", "text-white", "px-3", "py-1", "rounded", "hover:bg-blue-600", "transition-colors");

    addToCartBtn.addEventListener("click", () => {
        addToCart(product);
    });

    itemDiv.appendChild(imageContainer);
    itemDiv.appendChild(text);
    itemDiv.appendChild(addToCartBtn);
    itemsContainer.appendChild(itemDiv);
}

function addDragAndDropListeners(itemDiv) {
    itemDiv.setAttribute('draggable', true);
    itemDiv.addEventListener("dragstart", handleDragStart);
    itemDiv.addEventListener("dragover", handleDragOver);
    itemDiv.addEventListener("drop", handleDrop);
    itemDiv.addEventListener("dragend", handleDragEnd);
}

function removeDragAndDropListeners(itemDiv) {
    itemDiv.removeAttribute('draggable');
    itemDiv.removeEventListener("dragstart", handleDragStart);
    itemDiv.removeEventListener("dragover", handleDragOver);
    itemDiv.removeEventListener("drop", handleDrop);
    itemDiv.removeEventListener("dragend", handleDragEnd);
}

function handleDragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.dataset.productId);
    event.target.classList.add("opacity-50");
}

function handleDragOver(event) {
    event.preventDefault();
    const target = event.target.closest("[draggable]");
    if (target && !target.classList.contains("opacity-50")) {
        target.classList.add("border-2", "border-dashed", "border-gray-500");
    }
}

function handleDrop(event) {
    event.preventDefault();
    const productId = event.dataTransfer.getData("text/plain");
    const target = event.target.closest("[draggable]");
    if (target) {
        target.classList.remove("border-2", "border-dashed", "border-gray-500");
        moveProduct(productId, target.dataset.productId);
    }
}

function handleDragEnd(event) {
    event.target.classList.remove("opacity-50");
}

async function moveProduct(draggedProductId, targetProductId) {
    const itemsContainer = document.getElementById("itemsContainer");
    const draggedProduct = itemsContainer.querySelector(`[data-product-id="${draggedProductId}"]`);
    const targetProduct = itemsContainer.querySelector(`[data-product-id="${targetProductId}"]`);
    if (draggedProduct && targetProduct) {
        const nextSibling = targetProduct.nextElementSibling;
        itemsContainer.insertBefore(draggedProduct, nextSibling);

        debouncedUpdateProductPositions();
    }
}

const debouncedUpdateProductPositions = debounce(async () => {
    const itemsContainer = document.getElementById("itemsContainer");
    const productElements = itemsContainer.querySelectorAll(".product-item");
    const batch = writeBatch(db);
    productElements.forEach((productElement, index) => {
        const productId = productElement.dataset.productId;
        const productRef = doc(db, "products", productId);
        batch.update(productRef, { position: index + 1 });
    });
    await batch.commit();
}, 300);

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}

function toggleMovingMode(isEnabled, button) {
    const itemsContainer = document.getElementById("itemsContainer");
    const body = document.body;
    const stopMovingModeButton = document.getElementById("stopMovingModeBtn");

    if (isEnabled) {
        itemsContainer.classList.add("moving-mode");
        if (button) {
            
        }
        body.classList.add("bg-light-blue");
        stopMovingModeButton.classList.remove("hidden");

        document.querySelectorAll(".product-item").forEach(addDragAndDropListeners);
    } else {
        itemsContainer.classList.remove("moving-mode");
        if (button) {

        }
        body.classList.remove("bg-light-blue");
        stopMovingModeButton.classList.add("hidden");

        document.querySelectorAll(".product-item").forEach(removeDragAndDropListeners);
    }
}

export {
    addProduct,
    loadProducts,
    displayProduct
};