'use server';

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, setDoc, doc, Timestamp } from "firebase/firestore";
import type { UserProfile } from "@/types";

// Nama unik untuk aplikasi sekunder untuk menghindari konflik dengan aplikasi sisi klien utama.
const secondaryAppName = "secondary-auth-app-for-creation";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Menginisialisasi aplikasi sekunder dengan aman. Jika sudah diinisialisasi, gunakan yang sudah ada.
const secondaryApp: FirebaseApp = getApps().find(app => app.name === secondaryAppName) 
    ? getApp(secondaryAppName) 
    : initializeApp(firebaseConfig, secondaryAppName);

const secondaryAuth = getAuth(secondaryApp);
const secondaryDb = getFirestore(secondaryApp);

/**
 * Membuat akun pengguna di Firebase Auth dan profil mereka di Firestore
 * menggunakan instance aplikasi Firebase sekunder untuk menghindari logout admin saat ini.
 * @param email Email pengguna baru.
 * @param password Password pengguna baru.
 * @param profileData Data profil pengguna untuk disimpan di Firestore.
 * @returns Objek dengan status keberhasilan dan pesan atau error.
 */
export async function createUserAccount(
    email: string, 
    password: string, 
    profileData: Omit<UserProfile, 'uid'>
) {
    try {
        // 1. Buat pengguna di Firebase Authentication menggunakan aplikasi sekunder
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;

        if (!newUser) {
            throw new Error("Pembuatan pengguna di Authentication gagal.");
        }
        
        // 2. Siapkan objek profil lengkap dengan UID baru dari Auth
        const fullProfile: UserProfile = {
            ...profileData,
            uid: newUser.uid,
            createdAt: new Date().toISOString(), // Gunakan string ISO untuk konsistensi
        };

        // 3. Simpan profil pengguna lengkap ke koleksi 'users' di Firestore
        await setDoc(doc(secondaryDb, "users", newUser.uid), fullProfile);
        
        return { success: true, message: "Pengguna berhasil dibuat.", uid: newUser.uid };

    } catch (error: any) {
        console.error("Error di server action createUserAccount:", error);
        // Hapus pengguna dari Auth jika penyimpanan Firestore gagal untuk menghindari data yatim
        if (getAuth(secondaryApp).currentUser) {
            await getAuth(secondaryApp).currentUser?.delete();
        }
        return { 
            success: false, 
            message: `Gagal membuat pengguna: ${error.message}`, 
            errorCode: error.code 
        };
    }
}
