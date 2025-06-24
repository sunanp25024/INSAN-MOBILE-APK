import admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK for server-side operations.

// Ensure that the required environment variables are set.
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  // In development, this check might fail on startup if env variables are not set.
  // In production, these must be set in the deployment environment.
  console.warn(
    'Firebase Admin environment variables are not fully set. Server-side Firebase features will fail.'
  );
}

// The private key needs to have its escaped newlines replaced with actual newlines.
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(
  /\\n/g,
  '\n'
);

// Initialize the app if it's not already initialized.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
  }
}

// Export the initialized admin services.
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
