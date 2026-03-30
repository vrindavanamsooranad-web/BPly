// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Must strictly map the exact production keys configured inside your master deployment.
const firebaseConfig = {
  apiKey: "AIzaSyCLxcFU7CeHU0j4XREvEB6dJR288b14PtI",
  authDomain: "bply-431b6.firebaseapp.com",
  projectId: "bply-431b6",
  storageBucket: "bply-431b6.firebasestorage.app",
  messagingSenderId: "818029019990",
  appId: "1:818029019990:web:321f5114fb813fda5b8cf7"
};

// Initialize the Firebase app explicitly tailored for background worker environments
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Construct background message handler parsing specifically mapped BPly push payloads
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Native Background Notification Thread Hooked ->', payload);
  
  const notificationTitle = payload.notification.title || "BPly Reminder";
  const notificationOptions = {
    body: payload.notification.body || "Time to log your blood pressure reading natively via the BPly dashboard!",
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
