import React, { createContext, useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getAuthInstance, firebaseConfig } from '../../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// REST fallback endpoints
const FIREBASE_REST = {
  signUp: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
  signIn: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`
};

// Simple in-memory token store (Expo Go friendly)
let memoryAuthToken = null;

export const AuthContext = createContext();

// Basit memory storage (Expo Go için)
let memoryStorage = {};

const Storage = {
  getItem: async (key) => {
    return memoryStorage[key] || null;
  },
  setItem: async (key, value) => {
    memoryStorage[key] = value;
  },
  removeItem: async (key) => {
    delete memoryStorage[key];
  },
};

const AUTH_KEY = '@ddp_user_logged_in';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authAvailable, setAuthAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = null;
    
    const checkAuthStatus = async () => {
      try {
        // Firebase auth'u kontrol et
        try {
          const authInstance = getAuthInstance();
          if (authInstance) {
            setAuthAvailable(true);
            unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
              if (mounted) {
                if (firebaseUser) {
                  try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    const profile = userDoc.exists() ? userDoc.data() : null;
                    setUser({ ...firebaseUser, profile });
                  } catch (err) {
                    console.error('Failed to load user profile:', err);
                    setUser(firebaseUser);
                  }
                } else {
                  setUser(null);
                }
                setLoading(false);
              }
            });
          } else if (memoryAuthToken) {
            // REST fallback: we have a token from previous REST sign-in/register
            try {
              const restUser = await Storage.getItem('@ddp_rest_user');
              if (restUser) {
                const parsed = JSON.parse(restUser);
                try {
                  const userDoc = await getDoc(doc(db, 'users', parsed.localId));
                  const profile = userDoc.exists() ? userDoc.data() : null;
                  setUser({ uid: parsed.localId, email: parsed.email, profile });
                  setAuthAvailable(true);
                  setLoading(false);
                  return;
                } catch (e) {
                  console.error('AuthContext: failed to load profile for rest user', e);
                }
              }

              setAuthAvailable(true);
              setLoading(false);
            } catch (e) {
              console.error('REST fallback checkAuthStatus failed', e);
              setAuthAvailable(false);
              setLoading(false);
            }
          } else {
            if (mounted) {
              setAuthAvailable(false);
              setLoading(false);
            }
          }
        } catch (authError) {
          console.error('Auth setup error:', authError);
          if (mounted) {
            setAuthAvailable(false);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Storage error:', error);
        if (mounted) setLoading(false);
      }
    };

    // Auth'un initialize edilmesini bekle
    setTimeout(() => {
      checkAuthStatus();
    }, 100);

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loginAnonymously = async () => {
    try {
      const authInstance = getAuthInstance();
      if (!authAvailable || !authInstance) {
        throw new Error('Auth not available');
      }
      await signInAnonymously(authInstance);
    } catch (error) {
      throw error;
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      const authInstance = getAuthInstance();
      if (authInstance) {
        const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
        // Load profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          const profile = userDoc.exists() ? userDoc.data() : null;
          return { user: userCredential.user, profile };
        } catch (err) {
          return { user: userCredential.user, profile: null };
        }
      }

      // Fallback to REST API (Expo Go / when native auth not available)
      const res = await fetch(FIREBASE_REST.signIn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || 'REST signIn failed';
        // Map configuration-not-found to helpful message
        if (String(msg).toLowerCase().includes('configuration')) {
          throw new Error('Email/Password authentication is not enabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.');
        }
        throw new Error(msg);
      }

      // data contains idToken and localId
      memoryAuthToken = data.idToken;
      // Persist a small rest-user reference for session restore
      await Storage.setItem('@ddp_rest_user', JSON.stringify({ localId: data.localId, email: data.email }));

      // Load profile from Firestore and set user state so UI reacts
      try {
        const userDoc = await getDoc(doc(db, 'users', data.localId));
        const profile = userDoc.exists() ? userDoc.data() : null;
        const pseudoUser = { uid: data.localId, email: data.email };
        setUser({ ...pseudoUser, profile });
        setAuthAvailable(true);
        return { user: pseudoUser, profile };
      } catch (err) {
        setUser({ uid: data.localId, email: data.email });
        setAuthAvailable(true);
        return { user: { uid: data.localId, email: data.email }, profile: null };
      }
    } catch (error) {
      const msg = (error && (error.code || error.message)) ? (error.code || error.message) : null;
      if (msg && String(msg).toLowerCase().includes('configuration')) {
        throw new Error('Email/Password authentication is not enabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.');
      }
      throw error;
    }
  };

  const registerWithEmail = async (email, password, username = '', birthday = 0, gender = 0) => {
    try {
      // Basic validation
      if (!email || !password) throw new Error('Email and password are required');
      const authInstance = getAuthInstance();

      if (authInstance) {
        // Create auth user with SDK
        const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
        const uid = userCredential.user.uid;

        // Create Firestore profile (DO NOT store plaintext password)
        const userProfile = {
          oid: uid,
          mail: email,
          username: username || '',
          birthday: Number(birthday) || 0,
          gender: Number(gender) || 0,
          createdAt: Date.now()
        };

        await setDoc(doc(db, 'users', uid), userProfile);

        // Update Firebase Auth displayName
        if (username) {
          try {
            await updateProfile(userCredential.user, { displayName: username });
          } catch (e) {}
        }

        // Return both auth user and profile
        return { user: userCredential.user, profile: userProfile };
      }

      // Fallback to REST signUp
      const res = await fetch(FIREBASE_REST.signUp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || 'REST signUp failed';
        throw new Error(msg);
      }

      memoryAuthToken = data.idToken;
      const uid = data.localId;
      const userProfile = {
        oid: uid,
        mail: email,
        username: username || '',
        birthday: Number(birthday) || 0,
        gender: Number(gender) || 0,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', uid), userProfile);

      // Persist rest-user ref and set user state
      await Storage.setItem('@ddp_rest_user', JSON.stringify({ localId: uid, email }));
      setUser({ uid, email, profile: userProfile });
      setAuthAvailable(true);

      return { user: { uid, email }, profile: userProfile };
    } catch (error) {
      const msg = (error && (error.code || error.message)) ? (error.code || error.message) : null;
      if (msg && String(msg).toLowerCase().includes('configuration')) {
        throw new Error('Email/Password authentication is not enabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      const authInstance = getAuthInstance();
      if (authInstance && authAvailable) {
        await signOut(authInstance);
      } else if (memoryAuthToken) {
        // REST fallback: remove token
        memoryAuthToken = null;
      }
      setUser(null);
    } catch (error) {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const authInstance = getAuthInstance();
      if (authInstance && authInstance.currentUser) {
        const currentUser = authInstance.currentUser;
        await currentUser.reload();
        
        // Firestore'dan güncel profili çek
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const profile = userDoc.exists() ? userDoc.data() : null;
        setUser({ ...currentUser, profile });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginAnonymously, 
      loginWithEmail,
      registerWithEmail,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

