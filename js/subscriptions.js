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
  starter: { name: "Starter", productLimit: 500 },
  base: { name: "Base", productLimit: 1500 },
  professional: { name: "Professional", productLimit: Infinity },
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
    alert(`⚠️ You are already on ${subscriptionPlans[plan].name} plan!`);
    return;
  }

  const currentLimit = userData.productLimit || 0;

  if (subscriptionPlans[plan].productLimit < currentLimit) {
    const confirmDowngrade = confirm(
      `⚠️ Your product limit will be lowered by: ${subscriptionPlans[plan].productLimit}. Do you want to continue??`
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
        alert("❌ The store must have a name!");
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
