
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, query, collection, where, limit } from 'firebase/firestore';
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
  effectiveAllowedFunctions: string[]; // <-- ADICIONADO: A lista final de permissões
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
  effectiveAllowedFunctions: [], // <-- ADICIONADO
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
  const [effectiveAllowedFunctions, setEffectiveAllowedFunctions] = useState<string[]>([]); // <-- ADICIONADO
  const [userLoading, setUserLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(true);
  const [functionsLoading, setFunctionsLoading] = useState(true);
  const [memberPermissionsLoading, setMemberPermissionsLoading] = useState(false); // <-- ADICIONADO

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
    let unsubscribeMemberPermissions: (() => void) | undefined; // <-- ADICIONADO

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);

      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribePlanDoc) unsubscribePlanDoc();
      if (unsubscribeMemberPermissions) unsubscribeMemberPermissions(); // <-- ADICIONADO
      
      setSystemUser(null);
      setUserPlan(null);
      setEffectiveAllowedFunctions([]); // <-- ADICIONADO: Limpa ao deslogar

      if (authUser) {
        setUserLoading(true);
        const userDocRef = doc(db, 'users', authUser.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            const fetchedSystemUser = { uid: userDoc.id, ...userDoc.data() } as SystemUser;
            setSystemUser(fetchedSystemUser);
            
            // Lógica unificada para determinar permissões
            // Se for membro da equipe, busca as permissões do seu próprio documento de colaborador
            if (fetchedSystemUser.role === 'team_member' && fetchedSystemUser.mainAccountId) {
                setMemberPermissionsLoading(true);
                const collaboratorsQuery = query(collection(db, 'collaborators'), where('teamMemberUid', '==', fetchedSystemUser.uid), limit(1));
                
                unsubscribeMemberPermissions = onSnapshot(collaboratorsQuery, (snapshot) => {
                    if (!snapshot.empty) {
                        const collaboratorDoc = snapshot.docs[0];
                        const collaboratorData = collaboratorDoc.data();
                        setEffectiveAllowedFunctions(collaboratorData.allowedFunctions || []);
                    } else {
                        setEffectiveAllowedFunctions([]); // Nenhuma permissão se não encontrar o colaborador
                    }
                    setMemberPermissionsLoading(false);
                });
                setPlanLoading(false); // Membros de equipe não carregam plano diretamente
            } else {
                // Se for o dono (owner) ou um admin navegando no dashboard, busca as permissões do plano
                if (fetchedSystemUser.planId) {
                    setPlanLoading(true);
                    const planDocRef = doc(db, 'plans', fetchedSystemUser.planId);
                    unsubscribePlanDoc = onSnapshot(planDocRef, (planDoc) => {
                        if (planDoc.exists()) {
                            const planData = { id: planDoc.id, ...planDoc.data() } as Plan;
                            setUserPlan(planData);
                            setEffectiveAllowedFunctions(planData.allowedFunctions || []);
                        } else {
                            setUserPlan(null);
                            setEffectiveAllowedFunctions([]);
                        }
                        setPlanLoading(false);
                    });
                } else {
                    setUserPlan(null);
                    setEffectiveAllowedFunctions([]); // Sem plano, sem permissões baseadas em plano
                    setPlanLoading(false);
                }
                setMemberPermissionsLoading(false); // Não é membro, não carrega permissões de membro
            }
          } else {
            setSystemUser(null);
            setPlanLoading(false);
            setMemberPermissionsLoading(false);
          }
          setUserLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setSystemUser(null);
          setUserPlan(null);
          setEffectiveAllowedFunctions([]);
          setUserLoading(false);
          setPlanLoading(false);
          setMemberPermissionsLoading(false);
        });
      } else {
        setUserLoading(false);
        setPlanLoading(false);
        setMemberPermissionsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFunctions();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribePlanDoc) unsubscribePlanDoc();
      if (unsubscribeMemberPermissions) unsubscribeMemberPermissions(); // <-- ADICIONADO
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
    effectiveAllowedFunctions, // <-- ADICIONADO
    loading: userLoading || planLoading || functionsLoading || memberPermissionsLoading, // <-- ATUALIZADO
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
