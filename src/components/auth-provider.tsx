
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { SystemUser } from '@/types';

interface AuthContextType {
  user: User | null;
  systemUser: SystemUser | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  systemUser: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }

      if (authUser) {
        setLoading(true);
        const userDocRef = doc(db, 'users', authUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setSystemUser({ uid: docSnap.id, ...docSnap.data() } as SystemUser);
          } else {
            // This might happen briefly before the user doc is created
            setSystemUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setSystemUser(null);
          setLoading(false);
        });
      } else {
        setSystemUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  const isAdmin = systemUser?.role === 'admin';
  const value = { user, systemUser, isAdmin, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
