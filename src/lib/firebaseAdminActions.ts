'use server';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import type { UserProfile } from "@/types";

// A unique name for the secondary app to avoid conflicts with the primary app.
const secondaryAppName = "secondary-auth-app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Safely initialize the secondary app. If it's already initialized, use the existing one.
const secondaryApp = getApps().find(app => app.name === secondaryAppName) 
    ? getApp(secondaryAppName) 
    : initializeApp(firebaseConfig, secondaryAppName);

const secondaryAuth = getAuth(secondaryApp);
const secondaryDb = getFirestore(secondaryApp);

/**
 * Creates a user account in Firebase Auth and their profile in Firestore
 * using a secondary Firebase app instance to avoid logging out the current admin.
 * @param email The new user's email.
 * @param password The new user's password.
 * @param profileData The user profile data to be stored in Firestore.
 * @returns An object with success status and a message or error.
 */
export async function createUserAccount(
    email: string, 
    password: string, 
    profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'joinDate'> & { joinDate?: string }
) {
    try {
        // 1. Create the user in Firebase Authentication using the secondary app
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;

        if (!newUser) {
            throw new Error("User creation failed in Authentication.");
        }
        
        // 2. Prepare the full profile object with the new UID from Auth
        const fullProfile: UserProfile = {
            ...profileData,
            uid: newUser.uid,
            createdAt: new Date().toISOString(),
            joinDate: profileData.joinDate || new Date().toISOString(),
        };

        // 3. Save the complete user profile to the 'users' collection in Firestore
        // This uses the secondary Firestore instance.
        await setDoc(doc(secondaryDb, "users", newUser.uid), fullProfile);
        
        return { success: true, message: "User created successfully.", uid: newUser.uid };

    } catch (error: any) {
        console.error("Error in createUserAccount server action:", error);
        return { 
            success: false, 
            message: `Failed to create user: ${error.message}`, 
            errorCode: error.code 
        };
    }
}
