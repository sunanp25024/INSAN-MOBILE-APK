
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate the config to prevent silent failures
const missingConfig = Object.entries(firebaseConfig).find(([, value]) => !value);
if (missingConfig) {
  throw new Error(`Firebase config is missing or invalid: ${missingConfig[0]}. Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.`);
}


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase initialization error", error);
    // You might want to throw the error or handle it in a way that
    // doesn't break the app if Firebase is not critical for some parts.
    // For this app, Firebase is critical.
    throw new Error("Failed to initialize Firebase. Please check your configuration.");
  }
} else {
  app = getApp();
}

try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Error getting Firebase services", error);
  throw new Error("Failed to get Firebase services (Auth, Firestore, Storage). Ensure Firebase was initialized correctly.");
}

// Function to initialize messaging and handle token logic
export const initializeFirebaseMessaging = async (currentUserUid: string) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log("Push messaging is not supported in this browser.");
    return;
  }
  
  try {
    const messaging = getMessaging(app);

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const currentToken = await getToken(messaging, { 
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration
      });
      
      if (currentToken) {
        // Save the token to the user's profile in Firestore
        const userDocRef = doc(db, 'users', currentUserUid);
        await setDoc(userDocRef, { fcmToken: currentToken }, { merge: true });
        console.log('FCM Token registered successfully:', currentToken);
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Permission for notifications was not granted.');
    }
    
    // Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      // You can show an in-app notification/toast here
      new Notification(payload.notification?.title || 'New Message', {
        body: payload.notification?.body,
        icon: payload.notification?.icon,
      });
    });

  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
};


export { app, auth, db, storage };
