
// This service worker is intentionally left blank in the source code.
// Firebase will automatically generate a service worker file at this location
// during the build process when Firebase Messaging is initialized in the app.
// It must exist for the service worker registration to succeed.

// For local development and to handle background notifications,
// we'll import and initialize Firebase here.

importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js");

// **IMPORTANT**: You must copy your Firebase config object here.
// You can find this in your Firebase project settings.
// It's safe to expose this in a service worker.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || "/icons/icon-192x192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
