import admin from 'firebase-admin';

// NOTE: No 'use server' here. This is a server-side utility module, not a server action file.

// Check if the app is already initialized to prevent errors in hot-reloading environments
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // A more robust check to ensure all necessary parts of the configuration are present.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      'Firebase Admin credentials are not found in the environment variables. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  try {
    // Initialize the app with credentials only. Storage bucket will be specified at the point of use.
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.stack);
    throw new Error('Failed to initialize Firebase Admin SDK. Check the credentials and server logs.');
  }
}

// Export the initialized admin services. These lines will only be reached if initializeApp() succeeds.
const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { admin, adminAuth, adminDb };
