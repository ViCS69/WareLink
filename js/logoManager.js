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
    console.log("🔍 handleLogoUpload triggered");

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
        console.log("✅ User is logged in:", user.uid);

        const storeQuery = query(collection(db, "stores"), where("ownerId", "==", user.uid));
        const storeSnapshot = await getDocs(storeQuery);
        if (storeSnapshot.empty) {
            console.error("❌ Не е намерен магазин за този потребител!");
            alert("Не е намерен магазин за този потребител!");
            return;
        }

        const storeId = storeSnapshot.docs[0].id;
        console.log("✅ Found store ID:", storeId);

        const compressedFile=await compressImage(file);

        const fileName = `logo_${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `stores/${storeId}/logo/${fileName}`);

        console.log("📤 Uploading file...");
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`⬆️ Upload progress: ${progress.toFixed(2)}%`);
            },
            (error) => {
                console.error("❌ Грешка при качване:", error);
                alert(`Грешка при качване: ${error.message}`);
            },
            async () => {
                console.log("✅ Upload completed!");

                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                console.log("🌐 Download URL:", downloadUrl);

                const storeRef = doc(db, "stores", storeId);
                console.log("📝 Updating Firestore...");
                await updateDoc(storeRef, { logoUrl: downloadUrl });

                document.getElementById("storeLogo").src = `${downloadUrl}&t=${Date.now()}`;
                console.log("✅ UI Updated!");
            }
        );
    } catch (error) {
        console.error("❌ Грешка при качване:", error);
        alert(`Грешка при качване: ${error.message}`);
    }
}

async function compressImage(file, maxSize = 128, targetSizeKB = 50) {
    console.log(`⚡ Compressing Image to max ${maxSize}px...`);

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
            console.log(`🔍 Compressed Size: ${(compressedFile.size / 1024).toFixed(2)} KB at Quality ${quality * 100}%`);

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