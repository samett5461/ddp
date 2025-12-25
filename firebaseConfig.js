import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBUVe1GiYCN1apQhm2Ye_nYREzHmzGWyjc",
  authDomain: "deleteddailypictures.firebaseapp.com",
  projectId: "deleteddailypictures",
  storageBucket: "deleteddailypictures.firebasestorage.app",
  messagingSenderId: "236219279138",
  appId: "1:236219279138:web:b17915d86eb4b5f192a77b",
  measurementId: "G-EXN9FM9ENX"
};

let app;
const existingApps = getApps();
if (existingApps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = existingApps[0];
}

export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth'u lazy initialize et - Expo Go uyumluluğu için
let authInstance = null;
export const getAuthInstance = () => {
  if (!authInstance) {
    try {
      // App'in initialize edildiğinden emin ol
      if (!app) {
        console.warn('Firebase app not initialized');
        return null;
      }
      authInstance = getAuth(app);
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Expo Go'da auth çalışmayabilir, null döndür
      return null;
    }
  }
  return authInstance;
};

// Export etme - sadece getAuthInstance kullan
export { app };
