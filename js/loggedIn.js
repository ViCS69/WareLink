import { auth, logout } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js';
import { db } from './firebaseConfig.js';
import {
  collection,
  doc,
  getDoc,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';
import { loadUserSettings, saveUserSettings } from './settings.js';
import { upgradeToPremium } from './subscriptions.js';

let storeList, noResults;
let userDoc = null;
let storeDoc = null;
let allStores = [];

function updateStoreList(filteredStores) {
  storeList.innerHTML = '';

  if (filteredStores.length === 0) {
    noResults.style.display = 'block';
    return;
  } else {
    noResults.style.display = 'none';
  }

  filteredStores.slice(0, 7).forEach(store => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="viewstore.html?id=${store.storeId}">${store.storeName}</a>`;
    storeList.appendChild(li);
  });
}

function updateSubscriptionUI() {
  if (!userDoc) return;

  const currentPlan = userDoc.subscription;

  document.querySelectorAll('.subscription-btn').forEach(button => {
    const plan = button.getAttribute('data-plan');
    const originalClass = button.getAttribute('data-original-class');

    button.className = originalClass;
    button.disabled = false;

    if (plan === currentPlan) {
      button.textContent = 'Current plan';
      button.disabled = true;
      button.classList.remove(
        'bg-blue-600',
        'hover:bg-blue-700',
        'bg-gradient-to-tl',
        'from-purple-600',
        'to-purple-800',
        'hover:shadow-xl',
        'hover:scale-98',
        'text-white'
      );
      button.classList.add('bg-gray-400', 'text-gray-200', 'cursor-not-allowed');
    } else {
      button.textContent = currentPlan ? 'Change plan' : 'Start';
    }
  });
}

function checkUserSubscription() {
  const storeButton = document.getElementById('proceed-btn');

  if (userDoc?.subscription && storeDoc) {
    storeButton.classList.remove('pointer-events-none', 'opacity-50');
    storeButton.href = 'store.html';
    storeButton.removeAttribute('title');
  } else {
    storeButton.classList.add('pointer-events-none', 'opacity-50');
    storeButton.removeAttribute('href');
    storeButton.title = 'Go to pricing to create a store';
  }
}

async function loadStores() {
  try {
    const snapshot = await getDocs(collection(db, 'stores'));

    allStores = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        storeId: doc.id,
        storeName: data.storeName ?? 'Unknown Store',
        ownerId: data.ownerId ?? 'Unknown Owner'
      };
    });

    allStores.sort((a, b) => a.storeName.localeCompare(b.storeName));
    updateStoreList(allStores.slice(0, 7));
  } catch (err) {
    console.error('❌ Error loading stores:', err);
  }
}

export function openStoreNameModal() {
  return new Promise(resolve => {
    const modal = document.getElementById('storeNameModal');
    const input = document.getElementById('storeNameInput');
    const confirmBtn = document.getElementById('confirmStoreNameBtn');
    const cancelBtn = document.getElementById('cancelStoreNameBtn');

    modal.classList.remove('hidden');
    input.value = '';
    input.focus();

    function cleanup() {
      modal.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    }

    function onConfirm() {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const userEmailElement = document.getElementById('user-email');
  const logoutLink = document.getElementById('logout-link');
  const settingsBtn = document.getElementById('settings-btn');
  storeList = document.getElementById('storeList');
  noResults = document.getElementById('noResults');
  const searchInput = document.getElementById('searchStore');

  onAuthStateChanged(auth, async user => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    userEmailElement.textContent = `You're logged in as ${user.email}`;
    userEmailElement.classList.remove('hidden');
    settingsBtn.classList.remove('hidden');
    logoutLink.classList.remove('hidden');

    const userRef = doc(db, 'users', user.uid);
    const storeRef = doc(db, 'stores', user.uid);
    const [userSnap, storeSnap] = await Promise.all([getDoc(userRef), getDoc(storeRef)]);

    userDoc = userSnap.exists() ? userSnap.data() : null;
    storeDoc = storeSnap.exists() ? storeSnap.data() : null;

    updateSubscriptionUI();
    checkUserSubscription();
  });

  logoutLink.addEventListener('click', () => {
    logout();
    window.location.href = 'index.html';
  });

  document.querySelectorAll('button[data-plan]').forEach(button => {
    button.addEventListener('click', async () => {
      const user = auth.currentUser;
      if (!user) {
        alert('You have to login to edit your subscription.');
        return;
      }

      const plan = button.getAttribute('data-plan');
      await upgradeToPremium(user.uid, plan, userDoc, storeDoc);

      const userSnap = await getDoc(doc(db, 'users', user.uid));
      userDoc = userSnap.exists() ? userSnap.data() : null;

      updateSubscriptionUI();
      checkUserSubscription();
    });
  });

  searchInput.addEventListener('input', event => {
    const searchTerm = event.target.value.trim().toLowerCase();
    const results = allStores.filter(store =>
      store.storeName.toLowerCase().includes(searchTerm)
    );
    updateStoreList(results);
  });

  document.querySelectorAll('.subscription-btn').forEach(btn => {
    btn.setAttribute('data-original-class', btn.className);
  });

  loadStores();
  updateSubscriptionUI();
});

export { checkUserSubscription };
