import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  isAdmin: boolean;
  isPremium: boolean;
  loading: boolean;
  impersonateUser: (user: User) => void;
  stopImpersonating: () => void;
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isAdmin: false,
  isPremium: false,
  loading: true,
  impersonateUser: () => {},
  stopImpersonating: () => {},
  isImpersonating: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [realUser, setRealUser] = useState<FirebaseUser | null>(null);
  const [realUserProfile, setRealUserProfile] = useState<User | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setRealUser(currentUser);
      if (currentUser) {
        profileUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as User;
            setRealUserProfile(profile);
          } else {
            // If no profile exists, check if it's the default admin
            if ((currentUser.email === 'cerezvincent1@gmail.com' || currentUser.email === 'paoloesteban75@gmail.com') && currentUser.emailVerified) {
              setRealUserProfile({
                uid: currentUser.uid,
                email: currentUser.email,
                role: 'admin',
                credits: 9999,
                createdAt: new Date().toISOString()
              });
            }
          }
          setLoading(false);
        });
      } else {
        if (profileUnsubscribe) profileUnsubscribe();
        setRealUserProfile(null);
        setImpersonatedUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const impersonateUser = (user: User) => {
    if (realAdminStatus) {
      setImpersonatedUser(user);
    }
  };

  const stopImpersonating = () => {
    setImpersonatedUser(null);
  };

  const realAdminStatus = realUserProfile?.role === 'admin' || ((realUser?.email === 'cerezvincent1@gmail.com' || realUser?.email === 'paoloesteban75@gmail.com') && realUser?.emailVerified);
  
  const effectiveUserProfile = impersonatedUser || realUserProfile;
  const effectiveUser = impersonatedUser && realUser ? {
    ...realUser,
    uid: impersonatedUser.uid,
    email: impersonatedUser.email,
  } as FirebaseUser : realUser;

  const isAdmin = effectiveUserProfile?.role === 'admin' || ((effectiveUser?.email === 'cerezvincent1@gmail.com' || effectiveUser?.email === 'paoloesteban75@gmail.com') && effectiveUser?.emailVerified) || false;
  const isPremium = effectiveUserProfile?.role === 'premium' || isAdmin || false;

  return (
    <AuthContext.Provider value={{ 
      user: effectiveUser, 
      userProfile: effectiveUserProfile, 
      isAdmin, 
      isPremium, 
      loading,
      impersonateUser,
      stopImpersonating,
      isImpersonating: !!impersonatedUser
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
