import { db, auth } from "./firebaseConfig.js";
import { collection, doc, getDoc, addDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";


const userId = auth.currentUser?.uid;

let cartItems = []; 

function saveCart(storeId) {
    if (storeId) {
        localStorage.setItem(`cart_${storeId}`, JSON.stringify(cartItems));
    }
}

function setCurrentStore(storeId) {
    localStorage.setItem("currentStoreId", storeId);
    loadCart(storeId);
}

function loadCart(storeId) {
    if (!storeId) return;
    cartItems = JSON.parse(localStorage.getItem(`cart_${storeId}`)) || [];
    updateCart(storeId);
}

function addToCart(product) {
    const storeId = localStorage.getItem("currentStoreId");
    if (!storeId) {
        console.warn("⚠️ No store selected! Cannot add to cart.");
        return;
    }

    const existingItem = cartItems.find(item => item.id === product.id);

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

    cartItems.forEach(item => {
        total += item.price * item.quantity;

        const cartItem = document.createElement("div");
        cartItem.classList.add("flex", "items-center", "justify-between", "py-2", "border-b");

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
    const cartKey = `cart_${storeId}`;
    const localCartItems = JSON.parse(localStorage.getItem(cartKey)) || [];
  
    if (localCartItems.length === 0) {
      alert("❌ Your cart is empty!");
      return;
    }
  
    try {
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        const businessName = userData.businessName?.trim();
        console.log(businessName)
        
        const total = localCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const order = {
            storeId,
            userId,
            email: userData.email || currentUser.email || "unknown",
            businessName: businessName || "N/A",
            items: localCartItems,
            total,
            status: "pending",
            timestamp: serverTimestamp()
          };
      
        const orderId = crypto.randomUUID();
      
        const userOrderRef = collection(db, "users", userId, "orders");
        const storeOrderRef = collection(db, "stores", storeId, "receivedOrders");
      
          await setDoc(doc(userOrderRef, orderId), order);
          await setDoc(doc(storeOrderRef, orderId), order);     
      
        localStorage.removeItem(cartKey);
        cartItems = [];
        document.getElementById("cart-items").innerHTML = "";
        document.getElementById("cart-total").textContent = "0.00лв.";
      
        alert("✅ Checkout successful! Your order has been placed.");
        // window.location.href = "orders.html";
      
      } catch (error) {
        console.error("❌ Error processing checkout:", error);
        alert("⚠️ Error placing order. Please try again.");
      }
      
  }
  

function removeFromCart(productId) {
    const storeId = localStorage.getItem("currentStoreId");
    if (!storeId) return;

    cartItems = cartItems.filter(item => item.id !== productId);
    saveCart(storeId);
    updateCart(storeId);
}


document.addEventListener("DOMContentLoaded", () => {
    const storeId = localStorage.getItem("currentStoreId");
    if (storeId) {
        loadCart(storeId);
    }
});

export { addToCart, setCurrentStore, checkout };
