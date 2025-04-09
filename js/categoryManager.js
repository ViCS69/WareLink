import { db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { loadProducts } from "./productManager.js";

async function getStoreId(userUID) {
  const storeQuery = query(
    collection(db, "stores"),
    where("ownerId", "==", userUID)
  );
  const storeSnapshot = await getDocs(storeQuery);

  if (storeSnapshot.empty) {
    throw new Error("Не е намерен магазин за този потребител!");
  }

  return storeSnapshot.docs[0].id;
}

async function checkIfCategoryExists(categoryName) {
  const userUID = localStorage.getItem("userUID");
  if (!userUID) return false;

  const storeQuery = query(
    collection(db, "stores"),
    where("ownerId", "==", userUID)
  );
  const storeSnapshot = await getDocs(storeQuery);

  if (storeSnapshot.empty) return false;

  const storeId = storeSnapshot.docs[0].id;
  const categoryQuery = query(
    collection(db, "categories"),
    where("storeId", "==", storeId),
    where("name", "==", categoryName)
  );

  const categorySnapshot = await getDocs(categoryQuery);
  return !categorySnapshot.empty;
}

async function changeProductCategory(productId, newCategory) {
  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error("Product not found.");
    }

    const productData = productSnap.data();

    await updateDoc(productRef, { category: newCategory });

    await loadProducts(null, productData.storeId);
  } catch (error) {
    console.error("❌ Error changing product category:", error);
    throw error;
  }
}

async function getCategoriesForStore(storeId) {
  try {
    const categoriesQuery = query(
      collection(db, "categories"),
      where("storeId", "==", storeId)
    );
    const categorySnapshot = await getDocs(categoriesQuery);
    return categorySnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function populateCategoryDropdown(targetElement) {
  const userUID = localStorage.getItem("userUID");
  const storeId = userUID;
  const categories = await getCategoriesForStore(storeId);

  if (!targetElement) {
    console.error("populateCategoryDropdown → target element not found.");
    return;
  }

  targetElement.innerHTML = "";

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.name;
    option.textContent = category.name;
    targetElement.appendChild(option);
  });
}


async function addCategory(categoryName) {
  try {
    const userUID = localStorage.getItem("userUID");
    if (!userUID) {
      throw new Error("You are not logged in!");
    }

    const exists = await checkIfCategoryExists(categoryName);
    if (exists) {
      throw new Error("This category already exists!");
    }

    const storeQuery = query(
      collection(db, "stores"),
      where("ownerId", "==", userUID)
    );
    const storeSnapshot = await getDocs(storeQuery);

    if (storeSnapshot.empty) {
      throw new Error("Store isn't found!");
    }

    const storeId = storeSnapshot.docs[0].id;

    await addDoc(collection(db, "categories"), {
      name: categoryName,
      storeId: storeId,
      createdAt: new Date(),
    });

    await loadCategories(storeId);
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
}

async function deleteCategory(categoryName, storeId) {
  try {
    if (
      !confirm(
        `Are you sure you want to delete category: "${categoryName}"?`
      )
    ) {
      return;
    }

    const categoryQuery = query(
      collection(db, "categories"),
      where("storeId", "==", storeId),
      where("name", "==", categoryName)
    );

    const categorySnapshot = await getDocs(categoryQuery);

    if (categorySnapshot.empty) {
      throw new Error("Category isn't found!");
    }

    await deleteDoc(doc(db, "categories", categorySnapshot.docs[0].id));

    await loadCategories();

    await loadProducts();
  } catch (error) {
    console.error("Error deleting category:", error);
  }
}

async function loadCategories(storeId = null) {
  let queryStoreId = storeId;

  const isStorePage = document.getElementById("storePage") !== null;
  const isViewStorePage = document.getElementById("viewStorePage") !== null;

  if (!storeId && isStorePage) {
    const userUID = localStorage.getItem("userUID");
    if (!userUID) {
      console.warn("No user logged in.");
      return;
    }

    const storeQuery = query(
      collection(db, "stores"),
      where("ownerId", "==", userUID)
    );
    const storeSnapshot = await getDocs(storeQuery);

    if (storeSnapshot.empty) {
      console.warn("No store found for the user.");
      return;
    }

    queryStoreId = storeSnapshot.docs[0].id;
  }

  try {
    const categoryQuery = query(
      collection(db, "categories"),
      where("storeId", "==", queryStoreId)
    );
    const categorySnapshot = await getDocs(categoryQuery);

    const categoriesList = document.getElementById("categories-list");
    const categorySelect = document.getElementById("categorySelect");

    if (!isStorePage && !isViewStorePage) {
      console.error("❌ Not in store or viewstore, skipping category load.");
      return;
    }

    if (isStorePage && categorySelect) {
      categorySelect.innerHTML = "";
    }

    if (categoriesList) {
      categoriesList.innerHTML = "";
    }

    if (categoriesList) {
      const allCategoriesBtn = document.createElement("button");
      allCategoriesBtn.textContent = "All";
      allCategoriesBtn.classList.add(
        "flex",
        "items-center",
        "justify-center",
        "px-4",
        "py-2",
        "bg-gray-800",
        "text-white",
        "w-full",
        "hover:bg-gray-700",
        "mb-2"
      );
      allCategoriesBtn.addEventListener("click", () =>
        loadProducts(null, queryStoreId)
      );
      categoriesList.appendChild(allCategoriesBtn);
    }

    if (categorySnapshot.empty) {
      if (isStorePage && categorySelect) {
        categorySelect.innerHTML = `<option disabled selected>No categories found</option>`;
      }
      return;
    }

    categorySnapshot.forEach((doc) => {
      const category = doc.data();

      if (isStorePage && categorySelect) {
        const option = document.createElement("option");
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      }

      if (categoriesList) {
        const categoryBtn = document.createElement("div");
        categoryBtn.classList.add(
          "flex",
          "items-center",
          "justify-between",
          "px-4",
          "py-2",
          "hover:bg-gray-700",
          "text-white",
          "w-full",
          "group"
        );

        const categoryText = document.createElement("button");
        categoryText.textContent = category.name;
        categoryText.classList.add("text-left", "flex-grow");
        categoryText.addEventListener("click", () =>
          loadProducts(category.name, queryStoreId)
        );
        categoryBtn.appendChild(categoryText);
        categoriesList.appendChild(categoryBtn);

        if (isStorePage) {
          const deleteBtn = document.createElement("button");
          deleteBtn.innerHTML = "×";
          deleteBtn.classList.add(
            "text-gray-400",
            "hover:text-red-500",
            "text-xl",
            "font-bold",
            "px-2",
            "leading-none",
            "transition-colors",
            "duration-200"
          );
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteCategory(category.name, queryStoreId);
          });

          categoryBtn.appendChild(deleteBtn);
        }
      }
    });
  } catch (error) {
    console.error("❌ Error loading categories:", error);
  }
}

export {
  addCategory,
  loadCategories,
  checkIfCategoryExists,
  deleteCategory,
  changeProductCategory,
  getCategoriesForStore,
  getStoreId,
};
