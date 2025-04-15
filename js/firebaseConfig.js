import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js';
import {
  getFirestore,
  enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB3BhVOReju5IQ6_R2GAy36CdkEJ6zaOI0',
  authDomain: 'astral-bit-450012-k3.firebaseapp.com',
  projectId: 'astral-bit-450012-k3',
  storageBucket: 'astral-bit-450012-k3.firebasestorage.app',
  messagingSenderId: '151996753339',
  appId: '1:151996753339:web:744d171568d9064cf1109e',
  measurementId: 'G-GYVTKL9SN8'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

window.addEventListener('unhandledrejection', event => {
  if (
    event.reason?.code === 'ERR_BLOCKED_BY_CLIENT' ||
    event.reason?.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
    (event.reason?.target?.url && event.reason?.target?.url.includes('firestore.googleapis.com'))
  ) {
    event.preventDefault();
    return;
  }
});

window.addEventListener(
  'error',
  event => {
    if (
      event.target?.tagName === 'LINK' ||
      (event.target?.url && event.target?.url.includes('firestore.googleapis.com/google.firestore.v1.Firestore/Listen'))
    ) {
      event.preventDefault();
      return;
    }
  },
  true
);

auth.languageCode = 'en';

export { app, auth, db, storage };
