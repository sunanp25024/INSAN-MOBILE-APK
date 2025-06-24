'use server';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile } from '@/types';

/**
 * Creates a user account in Firebase Auth and their profile in Firestore
 * using the Firebase Admin SDK.
 *
 * @param email The new user's email.
 * @param password The new user's password.
 * @param profileData The profile data for the user to be stored in Firestore.
 * @returns An object with the success status and a message or error code.
 */
export async function createUserAccount(
  email: string,
  password: string,
  profileData: Omit<UserProfile, 'uid'>
) {
  try {
    // 1. Create the user in Firebase Authentication.
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: profileData.fullName,
      disabled: profileData.status === 'Nonaktif',
    });

    // 2. Prepare the full profile object with the new UID from Auth.
    const fullProfile: UserProfile = {
      ...profileData,
      uid: userRecord.uid,
      createdAt: new Date().toISOString(),
    };

    // 3. Save the complete user profile to the 'users' collection in Firestore.
    await adminDb.collection('users').doc(userRecord.uid).set(fullProfile);

    return { success: true, message: 'User created successfully.', uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error in createUserAccount server action:', error);
    
    return {
      success: false,
      message: `Failed to create user: ${error.message}`,
      errorCode: error.code,
    };
  }
}

/**
 * Deletes a user account from Firebase Auth and their profile from Firestore
 * using the Firebase Admin SDK.
 *
 * @param uid The UID of the user to delete.
 * @returns An object with the success status and a message.
 */
export async function deleteUserAccount(uid: string) {
  if (!uid) {
    return { success: false, message: 'User UID is required.' };
  }

  try {
    // First, delete the user from Firebase Authentication.
    await adminAuth.deleteUser(uid);
    
    // Then, delete the user's profile from Firestore.
    await adminDb.collection('users').doc(uid).delete();

    return { success: true, message: 'User deleted successfully from Auth and Firestore.' };
  } catch (error: any) {
    console.error(`Error deleting user ${uid}:`, error);
    
    // If the user was deleted from Auth but not Firestore (or vice-versa),
    // this could be logged for manual cleanup. For now, we return a generic error.
    return {
      success: false,
      message: `Failed to delete user: ${error.message}`,
      errorCode: error.code,
    };
  }
}
