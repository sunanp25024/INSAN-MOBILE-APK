
'use server';

import admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors in hot-reloading environments
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // The private key needs to have its escaped newlines replaced with actual newlines.
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
  
  let storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // A more robust check to ensure all necessary parts of the service account are present.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey || !storageBucket) {
    // This will stop execution and provide a clear error if the .env file is not set up correctly.
    // This is better than a console.warn because the app is in an unusable state without it.
    throw new Error(
      'Firebase Admin credentials not found in .env file. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.'
    );
  }

  // Sanitize the storage bucket name by removing the 'gs://' prefix if it exists.
  // This is a common configuration error that can cause "bucket not found" issues.
  if (storageBucket.startsWith('gs://')) {
    storageBucket = storageBucket.substring(5);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: storageBucket,
    });
  } catch (error: any) {
    // Catch potential errors during initialization, e.g., malformed private key.
    console.error('Firebase Admin SDK initialization error:', error.stack);
    throw new Error('Failed to initialize Firebase Admin SDK. Check the credentials and server logs.');
  }
}

// Export the initialized admin services. These lines will only be reached if initializeApp() succeeds.
const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { admin, adminAuth, adminDb };
