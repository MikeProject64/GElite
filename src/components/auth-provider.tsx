
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { SystemUser, Plan } from '@/types';

// Definição da Função (para ser usada globalmente)
export type AppFunction = {
  id: string;
  name: string;
  href: string;
  icon: string; // O nome do ícone como string
  isActive: boolean;
};

interface AuthContextType {
  user: User | null;
  systemUser: SystemUser | null;
  userPlan: Plan | null; // Adicionado para dados do plano
  availableFunctions: AppFunction[]; // Lista de todas as funções disponíveis
  loading: boolean; // Agora representa o carregamento combinado
  isAdmin: boolean;
  isOwner: boolean;
  isTeamMember: boolean;
  activeAccountId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  systemUser: null,
  userPlan: null,
  availableFunctions: [],
  loading: true,
  isAdmin: false,
  isOwner: false,
  isTeamMember: false,
  activeAccountId: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null);
  const [userPlan, setUserPlan] = useState<Plan | null>(null);
  const [availableFunctions, setAvailableFunctions] = useState<AppFunction[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(true);
  const [functionsLoading, setFunctionsLoading] = useState(true);

  useEffect(() => {
    // Busca a configuração do menu/funções uma única vez
    const menuConfigRef = doc(db, 'siteConfig', 'menu');
    const unsubscribeFunctions = onSnapshot(menuConfigRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAvailableFunctions((data.availableFunctions || []).filter((func: AppFunction) => func.isActive));
      }
      setFunctionsLoading(false);
    }, () => setFunctionsLoading(false));

    let unsubscribeUserDoc: (() => void) | undefined;
    let unsubscribePlanDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);

      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribePlanDoc) unsubscribePlanDoc();
      
      setSystemUser(null);
      setUserPlan(null);

      if (authUser) {
        setUserLoading(true);
        const userDocRef = doc(db, 'users', authUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const fetchedSystemUser = { uid: userDoc.id, ...userDoc.data() } as SystemUser;
            setSystemUser(fetchedSystemUser);

            // Se o usuário tem um planId, busca os dados do plano
            const planId = fetchedSystemUser.role === 'team_member' ? fetchedSystemUser.mainAccountId : fetchedSystemUser.uid;
            
            // Lógica para buscar o plano do dono da conta
            if (fetchedSystemUser.planId) {
                setPlanLoading(true);
                const planDocRef = doc(db, 'plans', fetchedSystemUser.planId);
                unsubscribePlanDoc = onSnapshot(planDocRef, (planDoc) => {
                    if (planDoc.exists()) {
                        setUserPlan({ id: planDoc.id, ...planDoc.data() } as Plan);
                    } else {
                        setUserPlan(null);
                    }
                    setPlanLoading(false);
                });
            } else {
                 setUserPlan(null);
                 setPlanLoading(false);
            }
          } else {
            setSystemUser(null);
            setPlanLoading(false);
          }
          setUserLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setSystemUser(null);
          setUserPlan(null);
          setUserLoading(false);
          setPlanLoading(false);
        });
      } else {
        setUserLoading(false);
        setPlanLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFunctions();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribePlanDoc) unsubscribePlanDoc();
    };
  }, []);

  const isAdmin = systemUser?.role === 'admin';
  const isOwner = systemUser?.role === 'owner';
  const isTeamMember = systemUser?.role === 'team_member';

  const activeAccountId = isTeamMember ? systemUser?.mainAccountId || null : user?.uid || null;

  const value = { 
    user, 
    systemUser, 
    userPlan,
    availableFunctions,
    loading: userLoading || planLoading || functionsLoading, 
    isAdmin, 
    isOwner, 
    isTeamMember, 
    activeAccountId 
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
