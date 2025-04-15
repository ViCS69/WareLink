import { db, storage } from './firebaseConfig.js';
import {
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  getDoc,
  updateDoc,
  increment,
  orderBy,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js';
import { compressImage } from './logoManager.js';
import { changeProductCategory, getCategoriesForStore, populateCategoryDropdown } from './categoryManager.js';
import { addToCart } from './cartManager.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js';

async function addProduct(name, price) {
  const userUID = localStorage.getItem('userUID');
  const category = document.getElementById('categorySelect').value;
  const productImage = document.getElementById('productImage').files[0];

  if (!userUID || !category || !productImage) {
    throw new Error('Моля, попълнете всички полета и изберете изображение.');
  }

  try {
    const storeId = await getStoreId(userUID);
    const imageUrl = await uploadProductImage(storeId, productImage);

    const cleanedName = cleanProductName(name);
    const unit = parseUnitFromName(name);

    const productQuery = query(
      collection(db, 'products'),
      where('storeId', '==', storeId),
      where('nameCleaned', '==', cleanedName)
    );

    const snapshot = await getDocs(productQuery);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const docRef = doc(db, 'products', existingDoc.id);
      const existing = existingDoc.data();

      await updateDoc(docRef, {
        quantity: existing.quantity,
        price: cleanPriceInput(price),
        imageUrl,
        category,
        unitType: unit?.unitType || null,
        unitValue: unit?.unitValue || null,
        updatedAt: serverTimestamp()
      });

      await loadProducts(null, storeId);
      return;
    }

    const productData = {
      storeId,
      category,
      name: name.trim(),
      nameCleaned: cleanedName,
      quantity: 0,
      price: cleanPriceInput(price),
      imageUrl,
      unitType: unit?.unitType || null,
      unitValue: unit?.unitValue || null,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'products'), productData);
    await loadProducts(null, productData.storeId);
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

async function updateProductInDatabase(product) {
  if (!product?.id) {
    console.error('updateProductInDatabase → product.id is missing');
    return;
  }

  const productRef = doc(db, 'products', product.id);

  try {
    await updateDoc(productRef, {
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      quantity: product.quantity,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating product:', error);
  }
}

function cleanPriceInput(input) {
  const sanitized = String(input)
    .replace(',', '.')
    .replace(/[^0-9.]/g, '');
  return parseFloat(sanitized);
}

function cleanProductName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/мл/g, 'ml')
    .replace(/л(?![a-z])/g, 'l')
    .replace(/гр/g, 'g')
    .replace(/кг/g, 'kg')
    .replace(/[.,]+$/, '');
}

function parseUnitFromName(name) {
  const normalized = name.toLowerCase();

  const mlMatch = normalized.match(/([\d.,]+)\s*(ml|мл)/);
  const lMatch = normalized.match(/([\d.,]+)\s*(l|л)/);
  const gMatch = normalized.match(/([\d.,]+)\s*(g|гр)/);
  const kgMatch = normalized.match(/([\d.,]+)\s*(kg|кг)/);
  const pcsMatch = normalized.match(/([\d.,]+)?\s*(бр|pcs|count)/);

  if (mlMatch) {
    return {
      unitType: 'ml',
      unitValue: parseFloat(mlMatch[1].replace(',', '.'))
    };
  } else if (lMatch) {
    return {
      unitType: 'ml',
      unitValue: parseFloat(lMatch[1].replace(',', '.')) * 1000
    };
  } else if (kgMatch) {
    return {
      unitType: 'g',
      unitValue: parseFloat(kgMatch[1].replace(',', '.')) * 1000
    };
  } else if (gMatch) {
    return {
      unitType: 'g',
      unitValue: parseFloat(gMatch[1].replace(',', '.'))
    };
  } else if (pcsMatch) {
    return { unitType: 'count', unitValue: parseInt(pcsMatch[1]) || 1 };
  }

  return null;
}

async function getStoreId(userUID) {
  const storeQuery = query(collection(db, 'stores'), where('ownerId', '==', userUID));
  const storeSnapshot = await getDocs(storeQuery);

  if (storeSnapshot.empty) {
    console.error('No store found for user:', userUID);
    throw new Error('Не е намерен магазин за този потребител!');
  }
  const storeId = storeSnapshot.docs[0].id;
  return storeId;
}

async function uploadProductImage(storeId, file) {
  try {
    const compressedFile = await compressImage(file, 384, 150);
    const fileName = `${Date.now()}_${compressedFile.name}`;
    const storageRef = ref(storage, `stores/${storeId}/products/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, compressedFile);
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {},
        error => {
          console.error('Upload failed:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

async function deleteProduct(productId) {
  try {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      console.error('Product not found:', productId);
      return;
    }

    const productData = productSnap.data();
    if (productData.imageUrl) {
      const imageRef = ref(storage, productData.imageUrl);
      await deleteObject(imageRef);
    }

    await deleteDoc(productRef);
  } catch (error) {
    console.error('Error deleting product:', error);
  }
}

let isInitialLoad = true;
async function loadProducts(category = null, storeId = null) {
  let queryStoreId = storeId;

  if (!storeId) {
    const userUID = localStorage.getItem('userUID');
    if (!userUID) {
      console.warn('No user logged in.');
      return;
    }

    const storeQuery = query(collection(db, 'stores'), where('ownerId', '==', userUID));
    const storeSnapshot = await getDocs(storeQuery);
    if (storeSnapshot.empty) {
      console.warn('No store found for the user.');
      return;
    }
    queryStoreId = storeSnapshot.docs[0].id;
  }
  try {
    let productQuery = query(collection(db, 'products'), where('storeId', '==', queryStoreId), orderBy('name', 'asc'));
    if (category) {
      productQuery = query(productQuery, where('category', '==', category));
    }
    const productSnapshot = await getDocs(productQuery);
    const itemsContainer = document.getElementById('itemsContainer');
    if (!itemsContainer) {
      console.error("❌ 'itemsContainer' not found in DOM.");
      return;
    }
    itemsContainer.innerHTML = '';
    if (productSnapshot.empty) {
      itemsContainer.innerHTML = `<p class="text-gray-500">No products found</p>`;
      return;
    }
    productSnapshot.forEach(doc => {
      const product = doc.data();
      product.id = doc.id;
      displayProduct(product);
    });
  } catch (error) {
    console.error('❌ Error loading products:', error);
  }
}

const editProductModal = document.getElementById('editProductModal');
const editName = document.getElementById('editName');
const editPrice = document.getElementById('editPrice');
const editQuantity = document.getElementById('editQuantity');
const editCategory = document.getElementById('editCategory');
const editImageUrl = document.getElementById('editImageFile');

let currentProductBeingEdited = null;

async function openEditModal(product) {
  currentProductBeingEdited = product;

  editName.value = product.name;
  editPrice.value = product.price;
  editQuantity.value = 0;
  editImageFile.value = product.imageUrl || '';

  await populateCategoryDropdown(document.getElementById('editCategory'));
  editCategory.value = product.category || '';

  editProductModal.classList.remove('hidden');
}

document.getElementById('cancelEdit').addEventListener('click', () => {
  editProductModal.classList.add('hidden');
});

document.getElementById('saveEdit').addEventListener('click', async () => {
  const fileInput = document.getElementById('editImageFile');
  const newImageFile = fileInput.files[0];
  const userUID = localStorage.getItem('userUID');

  if (!userUID) return alert('User not logged in.');

  const storeId = await getStoreId(userUID);

  let imageUrl = currentProductBeingEdited.imageUrl;

  if (newImageFile) {
    imageUrl = await uploadProductImage(storeId, newImageFile);
  }

  const updatedProduct = {
    ...currentProductBeingEdited,
    name: editName.value.trim(),
    price: parseFloat(editPrice.value),
    imageUrl,
    category: editCategory.value,
    quantity: currentProductBeingEdited.quantity + parseInt(editQuantity.value || 0)
  };

  await updateProductInDatabase(updatedProduct);

  editProductModal.classList.add('hidden');
  location.reload();
});

function displayProduct(product) {
  const itemsContainer = document.getElementById('itemsContainer');
  const itemDiv = document.createElement('div');
  itemDiv.classList.add(
    'product-item',
    'bg-white',
    'shadow-md',
    'rounded',
    'p-4',
    'text-center',
    'flex',
    'flex-col',
    'gap-2',
    'relative',
    'hover:bg-gray-100',
    'hover:outline',
    'hover:outline-2',
    'hover:outline-gray-300',
    'hover:outline-offset-0',
    'transition-colors',
    'focus:outline-none',
    'transition-transform',
    'duration-300'
  );
  itemDiv.dataset.productId = product.id;

  const imageContainer = document.createElement('div');
  imageContainer.classList.add('flex-1', 'overflow-hidden');
  if (product.imageUrl) {
    const img = document.createElement('img');
    img.src = product.imageUrl;
    img.alt = product.name;
    img.classList.add('w-4/5', 'h-48', 'mx-auto', 'object-contain', 'rounded');
    imageContainer.appendChild(img);
  }

  const text = document.createElement('p');
  text.classList.add('text-lg', 'font-semibold', 'mt-2', 'text-gray-800');
  text.textContent = `${product.name} - ${product.price.toFixed(2)}€.`;

  const isStorePage = document.getElementById('storePage') !== null;
  if (isStorePage) {
    const settingsMenu = document.createElement('div');
    settingsMenu.classList.add('relative');

    const threeDotsIcon = document.createElement('button');
    threeDotsIcon.classList.add(
      'three-dots-icon',
      'absolute',
      'top-2',
      'right-2',
      'text-gray-500',
      'hover:text-gray-700',
      'p-2'
    );
    threeDotsIcon.innerHTML = "<i class='fas fa-ellipsis-v'></i>";

    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add(
      'dropdown-menu',
      'absolute',
      'right-0',
      'mt-2',
      'w-48',
      'bg-white',
      'border',
      'rounded',
      'shadow-lg',
      'transition-opacity',
      'duration-300'
    );
    dropdownMenu.style.display = 'none';

    const deleteOption = document.createElement('a');
    deleteOption.href = '#';
    deleteOption.classList.add('block', 'px-4', 'py-2', 'text-gray-800', 'hover:bg-gray-200');
    deleteOption.textContent = '🗑 Delete product';

    const editOption = document.createElement('a');
    editOption.href = '#';
    editOption.classList.add('block', 'px-4', 'py-2', 'text-gray-800', 'hover:bg-gray-200');
    editOption.textContent = '✎ Edit item';

    dropdownMenu.appendChild(deleteOption);
    dropdownMenu.appendChild(editOption);

    settingsMenu.appendChild(threeDotsIcon);
    settingsMenu.appendChild(dropdownMenu);
    itemDiv.appendChild(settingsMenu);

    function toggleDropdown() {
      const isVisible = dropdownMenu.style.display === 'block';
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
      });
      dropdownMenu.style.display = isVisible ? 'none' : 'block';
    }

    threeDotsIcon.addEventListener('click', event => {
      event.stopPropagation();
      toggleDropdown();
    });

    document.addEventListener('click', event => {
      if (!settingsMenu.contains(event.target)) {
        dropdownMenu.style.display = 'none';
      }
    });

    deleteOption.addEventListener('click', async event => {
      event.preventDefault();
      await deleteProduct(product.id);
      itemDiv.remove();
    });

    editOption.addEventListener('click', event => {
      event.preventDefault();
      openEditModal(product);
    });
  }

  itemDiv.appendChild(imageContainer);
  itemDiv.appendChild(text);
  itemsContainer.appendChild(itemDiv);

  const addToCartBtn = document.createElement('button');
  addToCartBtn.textContent = 'Add to Cart';
  addToCartBtn.classList.add(
    'mt-auto',
    'bg-green-500',
    'text-white',
    'px-3',
    'py-1',
    'rounded-lg',
    'hover:bg-green-600',
    'transition-colors'
  );

  addToCartBtn.addEventListener('click', () => {
    addToCart(product);
  });

  itemDiv.appendChild(imageContainer);
  itemDiv.appendChild(text);
  itemDiv.appendChild(addToCartBtn);
  itemsContainer.appendChild(itemDiv);
}

export { addProduct, loadProducts, displayProduct, cleanProductName };
