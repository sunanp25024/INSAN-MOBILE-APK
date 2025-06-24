'use server';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile } from '@/types';

/**
 * Creates a user account in Firebase Auth and their profile in Firestore
 * using the Firebase Admin SDK. This action is safe to call from the server
 * and will not interfere with the currently logged-in user's session.
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
    // 1. Create the user in Firebase Authentication using the Admin SDK.
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      displayName: profileData.fullName,
      disabled: profileData.status === 'Nonaktif',
    });

    // 2. Prepare the full profile object with the new UID from Auth.
    const fullProfile: UserProfile = {
      ...profileData,
      uid: userRecord.uid, // Use the UID from the newly created user record.
      createdAt: new Date().toISOString(),
    };

    // 3. Save the complete user profile to the 'users' collection in Firestore.
    // The document ID is set to the user's UID for easy lookup.
    await adminDb.collection('users').doc(userRecord.uid).set(fullProfile);

    return { success: true, message: 'User created successfully.', uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error in createUserAccount server action:', error);
    
    // Return a structured error response.
    return {
      success: false,
      message: `Failed to create user: ${error.message}`,
      errorCode: error.code, // e.g., 'auth/email-already-exists'
    };
  }
}
