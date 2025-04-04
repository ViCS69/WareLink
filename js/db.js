import { db } from "./firebaseConfig.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

async function createUserStore(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      createdAt: new Date(),
      storeId: user.uid,
    });

    await setDoc(doc(db, "stores", user.uid), {
      ownerId: user.uid,
      storeName: `${user.displayName}'s Store`,
      createdAt: new Date(),
    });
  }
}

export { db, createUserStore };
