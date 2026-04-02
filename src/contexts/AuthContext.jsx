import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Dedicated Loader Component restricted to App mode
function NativePwaLoader() {
  if (typeof window !== 'undefined' && window.matchMedia('(display-mode: browser)').matches) {
    return null; // Skip entirely on standard websites
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#ffffff] m-0 fixed inset-0 z-[99999]">
      <img src="/maskable-icon.svg" className="w-[100px] h-[100px] rounded-[20%] shadow-[0_4px_12px_rgba(37,99,235,0.2)] animate-[bply-heartbeat_1.5s_ease-in-out_infinite]" alt="BPly Booting" />
    </div>
  );
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 3-Second Forced Limit: Never let the loading screen hang
    const failsafe = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user || null);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        clearTimeout(failsafe);
        return;
      }

      setLoading(false); // Unblock immediately
      clearTimeout(failsafe);

      // Fetch user profile silently
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        setUserProfile(null);
      }
    });

    return () => {
      clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    userProfile,
    setUserProfile, 
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <NativePwaLoader /> : children}
    </AuthContext.Provider>
  );
}
