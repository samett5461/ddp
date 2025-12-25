import React, { createContext, useState, useEffect, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getAuthInstance } from '../../firebaseConfig';

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
            unsubscribe = onAuthStateChanged(authInstance, (user) => {
              if (mounted) {
                setUser(user);
                setLoading(false);
              }
            });
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
      console.error('Anonymous login error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      const authInstance = getAuthInstance();
      if (!authAvailable || !authInstance) {
        throw new Error('Auth not available');
      }
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Email login error:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email, password, displayName) => {
    try {
      const authInstance = getAuthInstance();
      if (!authAvailable || !authInstance) {
        throw new Error('Auth not available');
      }
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      
      // Kullanıcı adını güncelle
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Email register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const authInstance = getAuthInstance();
      if (authInstance && authAvailable) {
        await signOut(authInstance);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginAnonymously, 
      loginWithEmail,
      registerWithEmail,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

