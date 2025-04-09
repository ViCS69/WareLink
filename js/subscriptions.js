import { db } from "./firebaseConfig.js";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { auth } from "./auth.js";
import { openStoreNameModal } from "./loggedIn.js";

export const subscriptionPlans = {
  starter: { name: "Стартов", productLimit: 500 },
  base: { name: "Базов", productLimit: 1500 },
  professional: { name: "Професионален", productLimit: Infinity },
};

async function upgradeToPremium(userId, plan, existingUserData = null, existingStoreData = null) {
  if (!subscriptionPlans[plan]) {
    console.error("❌ Invalid plan selected");
    return;
  }

  const userRef = doc(db, "users", userId);
  const storeRef = doc(db, "stores", userId);

  const userData = existingUserData || (await getDoc(userRef)).data();
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
    if (!confirmDowngrade) return;
  }

  let storeName = existingStoreData?.storeName;

  if (!storeName) {
    const storeSnap = await getDoc(storeRef);
    if (storeSnap.exists()) {
      storeName = storeSnap.data().storeName;
    } else {
      storeName = await openStoreNameModal();
      if (!storeName) {
        alert("❌ Магазинът трябва да има име!");
        return;
      }
    }
  }

  await setDoc(storeRef, {
    ownerId: userId,
    storeName,
    productLimit: subscriptionPlans[plan].productLimit,
  }, { merge: true });

  await updateDoc(userRef, {
    subscription: plan,
    productLimit: subscriptionPlans[plan].productLimit,
  });
}

export { upgradeToPremium };
