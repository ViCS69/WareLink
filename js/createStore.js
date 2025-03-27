import { db } from "./firebaseConfig.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { auth } from "./auth.js";

async function createStore(storeName) {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        alert("❌ Грешка: Потребителят не съществува!");
        return;
    }

    const userData = userSnap.data();
    
    if (!userData.subscription) {
        alert("❌ Трябва да закупите план, за да създадете магазин!");
        return;
    }

    const storeRef = doc(db, "stores", auth.currentUser.uid);
    await setDoc(storeRef, {
        ownerId: auth.currentUser.uid,
        storeName: storeName,
        productLimit: userData.productLimit,
        logoUrl: "./resources/default.svg"
    });

    alert("✅ Магазинът е успешно създаден!");
}