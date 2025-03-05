import { query, collection, getDocs, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";
import { db, storage } from "./firebaseConfig.js";
import { auth } from "./firebaseConfig.js";
import {loadProducts} from "./productManager.js"
async function loadStoreLogo() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const storeQuery = query(collection(db, "stores"), where("ownerId", "==", user.uid));
        const storeSnapshot = await getDocs(storeQuery);

        if (!storeSnapshot.empty) {
            const storeData = storeSnapshot.docs[0].data();
            if (storeData.logoUrl) {
                document.getElementById("storeLogo").src = `${storeData.logoUrl}&t=${Date.now()}`;
            }
        }
    } catch (error) {
        console.error("❌ Error loading store logo:", error);
    }
}

async function loadStoreName() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const storeQuery = query(collection(db, "stores"), where("ownerId", "==", user.uid));
        const storeSnapshot = await getDocs(storeQuery);

        if (!storeSnapshot.empty) {
            const storeData = storeSnapshot.docs[0].data();
            document.getElementById("storeName").innerText = storeData.storeName;

            await loadProducts(null, storeSnapshot.docs[0].id);
        } else {
            document.getElementById("storeName").innerText = "❌ No store found!";
        }
    } catch (error) {
        console.error("❌ Error loading store name:", error);
        document.getElementById("storeName").innerText = "⚠️ Error loading store.";
    }
}

async function handleLogoUpload(event) {

    const file = event.target.files[0];
    if (!file) {
        alert("Моля, изберете файл.");
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            console.error("❌ Не сте влезли в системата!");
            alert("Не сте влезли в системата!");
            return;
        }

        const storeQuery = query(collection(db, "stores"), where("ownerId", "==", user.uid));
        const storeSnapshot = await getDocs(storeQuery);
        if (storeSnapshot.empty) {
            console.error("❌ Не е намерен магазин за този потребител!");
            alert("Не е намерен магазин за този потребител!");
            return;
        }

        const storeId = storeSnapshot.docs[0].id;

        const compressedFile=await compressImage(file);

        const fileName = `logo_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `stores/${storeId}/logo/${fileName}`);

        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            },
            (error) => {
                console.error("❌ Грешка при качване:", error);
                alert(`Грешка при качване: ${error.message}`);
            },
            async () => {
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                const storeRef = doc(db, "stores", storeId);
                await updateDoc(storeRef, { logoUrl: downloadUrl });

                document.getElementById("storeLogo").src = `${downloadUrl}&t=${Date.now()}`;
            }
        );
    } catch (error) {
        console.error("❌ Грешка при качване:", error);
        alert(`Грешка при качване: ${error.message}`);
    }
}

async function compressImage(file, maxSize = 128, targetSizeKB = 50) {

    let quality = 0.8; 
    let compressedFile;

    const options = {
        maxWidthOrHeight: maxSize, 
        useWebWorker: true,
        fileType: "image/webp",
    };

    try {
        do {
            options.initialQuality = quality; 
            compressedFile = await imageCompression(file, options);

            if (compressedFile.size <= targetSizeKB * 1024) break;

            quality -= 0.2;
        } while (quality > 0.2);

        return compressedFile;
    } catch (error) {
        console.error("❌ Compression error:", error);
        return file;
    }
}

export{compressImage, loadStoreLogo, handleLogoUpload, loadStoreName};