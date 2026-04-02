import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if we're in standalone mode (installed PWA)
  const isStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // INSTANT HANDSHAKE: Resolve the global loading block the millisecond Firebase answers.
      setCurrentUser(user || null);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setLoading(false); // Unblock immediately

      // Fetch user profile silently in the background
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    setUserProfile, 
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        isStandalone ? (
          <div className="flex items-center justify-center min-h-screen bg-white m-0 fixed inset-0 z-[99999]">
            <img src="/maskable-icon.svg" className="w-[100px] h-[100px] rounded-[20%] shadow-[0_4px_12px_rgba(37,99,235,0.2)] animate-[bply-heartbeat_1.5s_ease-in-out_infinite]" alt="BPly Booting" />
          </div>
        ) : null // Fall back to empty node on Desktop Web while bridging
      ) : children}
    </AuthContext.Provider>
  );
}
