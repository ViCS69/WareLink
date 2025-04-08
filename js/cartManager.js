import { db, auth } from "./firebaseConfig.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

let cartItems = [];

function getCartKey(storeId) {
  const userId = auth.currentUser?.uid;
  if (!storeId || !userId) return null;
  return `cart_${storeId}_${userId}`;
}

function saveCart(storeId) {
  const key = getCartKey(storeId);
  if (key) {
    localStorage.setItem(key, JSON.stringify(cartItems));
  }
}

function setCurrentStore(storeId) {
  localStorage.setItem("currentStoreId", storeId);
}

function loadCartForCurrentStore() {
  const storeId = localStorage.getItem("currentStoreId");
  const userId = auth.currentUser?.uid;
  if (!storeId || !userId) return;
  loadCart(storeId);
}

function loadCart(storeId) {
  const key = getCartKey(storeId);
  if (!key) return;
  cartItems = JSON.parse(localStorage.getItem(key)) || [];
  updateCart(storeId);
}

function addToCart(product) {
  const storeId = localStorage.getItem("currentStoreId");
  if (!storeId) {
    console.warn("⚠️ No store selected! Cannot add to cart.");
    return;
  }

  const existingItem = cartItems.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cartItems.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  }

  saveCart(storeId);
  updateCart(storeId);
}

function updateCart(storeId) {
  const cartContainer = document.getElementById("cart-items");
  if (!cartContainer) return;
  cartContainer.innerHTML = "";

  let total = 0;

  cartItems.forEach((item) => {
    total += item.price * item.quantity;

    const cartItem = document.createElement("div");
    cartItem.classList.add(
      "flex",
      "items-center",
      "justify-between",
      "py-2",
      "border-b"
    );

    cartItem.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-16 h-16 flex items-center justify-center bg-gray-100 border rounded overflow-hidden">
          <img src="${item.imageUrl}" alt="${item.name}" class="w-full h-full object-contain">
        </div>
        <div>
          <p class="font-medium">${item.name}</p>
          <p class="text-sm">${item.quantity} x ${item.price.toFixed(2)}лв.</p>
        </div>
      </div>
      <div class="flex flex-col items-end">
        <p class="font-semibold">${(item.price * item.quantity).toFixed(2)}лв.</p>
        <button class="text-red-500 text-sm mt-1 hover:underline" data-remove="${item.id}">Remove</button>
      </div>
    `;

    cartContainer.appendChild(cartItem);

    const removeBtn = cartItem.querySelector("[data-remove]");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        removeFromCart(removeBtn.dataset.remove);
      });
    }
  });

  document.getElementById("cart-total").textContent = `${total.toFixed(2)}лв.`;
  saveCart(storeId);
}

async function checkout() {
  const storeId = localStorage.getItem("currentStoreId");
  const currentUser = auth.currentUser;

  if (!storeId || !currentUser) {
    alert("❌ Store or user not set or user not authenticated!");
    return;
  }

  const userId = currentUser.uid;
  const key = getCartKey(storeId);
  const localCartItems = key ? JSON.parse(localStorage.getItem(key)) || [] : [];

  if (localCartItems.length === 0) {
    alert("❌ Your cart is empty!");
    return;
  }

  try {
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    const businessName = userData.businessName?.trim();

    const total = localCartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const order = {
      storeId,
      userId,
      email: userData.email || currentUser.email || "unknown",
      businessName: businessName || "N/A",
      items: localCartItems,
      total,
      status: "pending",
      timestamp: serverTimestamp(),
    };

    const orderId = crypto.randomUUID();

    const userOrderRef = collection(db, "users", userId, "orders");
    const storeOrderRef = collection(db, "stores", storeId, "receivedOrders");

    await setDoc(doc(userOrderRef, orderId), order);
    await setDoc(doc(storeOrderRef, orderId), order);

    if (key) localStorage.removeItem(key);
    cartItems = [];
    document.getElementById("cart-items").innerHTML = "";
    document.getElementById("cart-total").textContent = "0.00лв.";

    alert("✅ Checkout successful! Your order has been placed.");
    window.location.href = "orders.html";
  } catch (error) {
    console.error("❌ Error processing checkout:", error);
    alert("⚠️ Error placing order. Please try again.");
  }
}

function removeFromCart(productId) {
  const storeId = localStorage.getItem("currentStoreId");
  if (!storeId) return;

  cartItems = cartItems.filter((item) => item.id !== productId);
  saveCart(storeId);
  updateCart(storeId);
}

document.addEventListener("DOMContentLoaded", () => {
  loadCartForCurrentStore();
});

export { addToCart, setCurrentStore, checkout, loadCartForCurrentStore };
