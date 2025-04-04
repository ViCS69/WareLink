import { db } from "./firebaseConfig.js";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { auth } from "./auth.js";

export const subscriptionPlans = {
  starter: { name: "Стартов", productLimit: 500 },
  base: { name: "Базов", productLimit: 1500 },
  professional: { name: "Професионален", productLimit: Infinity },
};

async function upgradeToPremium(userId, plan) {
  if (!subscriptionPlans[plan]) {
    console.error("❌ Invalid plan selected");
    return;
  }

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    alert("❌ Потребителят не съществува!");
    return;
  }

  const userData = userSnap.data();
  const currentPlan = userData.subscription || null;

  if (currentPlan === plan) {
    alert(`⚠️ Вие вече сте на план ${subscriptionPlans[plan].name}!`);
    return;
  }

  const currentLimit = userData.productLimit || 0;

  if (subscriptionPlans[plan].productLimit < currentLimit) {
    const confirmDowngrade = confirm(
      `⚠️ Вашият лимит за продукти ще бъде намален до ${subscriptionPlans[plan].productLimit}. Искате ли да продължите?`
    );

    if (!confirmDowngrade) {
      return;
    }
  }

  let storeRef = doc(db, "stores", userId);
  let storeSnap = await getDoc(storeRef);
  let storeName = storeSnap.exists() ? storeSnap.data().storeName : null;

  if (!storeName) {
    storeName = prompt("Въведете име на вашия магазин:");
    if (!storeName) {
      alert("❌ Магазинът трябва да има име!");
      return;
    }

    await setDoc(storeRef, {
      ownerId: userId,
      storeName: storeName,
      productLimit: subscriptionPlans[plan].productLimit,
    });
  }

  await updateDoc(userRef, {
    subscription: plan,
    productLimit: subscriptionPlans[plan].productLimit,
  });

  alert(`Вашият план е променен на ${subscriptionPlans[plan].name}!`);
}

export { upgradeToPremium };
