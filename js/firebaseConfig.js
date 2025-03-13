import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code === 'ERR_BLOCKED_BY_CLIENT' || 
        event.reason?.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
        (event.reason?.target?.url && event.reason?.target?.url.includes('firestore.googleapis.com'))) {
        event.preventDefault();
        return;
    }
});

window.addEventListener('error', (event) => {
    if (event.target?.tagName === 'LINK' || 
        (event.target?.url && event.target?.url.includes('firestore.googleapis.com/google.firestore.v1.Firestore/Listen'))) {
        event.preventDefault();
        return;
    }
}, true);

auth.languageCode = 'en';

export { app, auth, db, storage };
