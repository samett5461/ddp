import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyC0rJxCzWUvAuwIb-i2o-SDXgr7vceIw0A",
  authDomain: "projectd-7a57f.firebaseapp.com",
  projectId: "projectd-7a57f",
  storageBucket: "projectd-7a57f.appspot.com",
  messagingSenderId: "443737598672",
  appId: "1:443737598672:web:daf9b4259b03c0cac24cd5",
  measurementId: "G-DSPZ2TVNW7"
};

// Initialize or reuse existing app (safe for hot reload / Expo)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);

// Try to register native auth component at module load (RN) if available
if (Platform.OS !== 'web') {
  try {
    initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (e) {
    // Silent fail - will try lazy init
  }
}

// Auth'u güvenli şekilde al
let authInstance = null;
export const getAuthInstance = () => {
  if (authInstance) return authInstance;

  try {
    if (Platform.OS === 'web') {
      authInstance = getAuth(app);
      return authInstance;
    }

    // On native, prefer the registered auth or initialize lazily
    try {
      // First try to get an existing auth instance (this is the common case)
      try {
        const existing = getAuth(app);
        authInstance = existing;
        return authInstance;
      } catch (getErr) {
        // If auth component is not registered, register it and retry
        const msg = getErr && getErr.message ? getErr.message : '';
        if (msg.includes('Component auth has not been registered') || msg.includes('not been registered')) {
          try {
            initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
          } catch (initErr) {
            // Ignore auth/already-initialized (expected if another init raced in)
            if (initErr && initErr.code !== 'auth/already-initialized') {
              console.error('Auth init error:', initErr.message);
            }
          }

          try {
            const retry = getAuth(app);
            authInstance = retry;
            return authInstance;
          } catch (finalErr) {
            return null;
          }
        }

        return null;
      }
    } catch (err) {
      console.error('Auth initialization unexpected error:', err && err.message ? err.message : err);
      return null;
    }
  } catch (error) {
    console.error('Auth initialization error:', error);
    return null;
  }
};

export { app };
