

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-provider';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserSettings, defaultSettings, Plan, FeatureFlags } from '@/types';

interface SettingsContextType {
    settings: UserSettings;
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: defaultSettings,
    updateSettings: async () => {},
    loading: true,
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const { user, systemUser } = useAuth();
    
    const [globalSettings, setGlobalSettings] = useState<UserSettings>(defaultSettings);
    const [userSettings, setUserSettings] = useState<Partial<UserSettings>>({});
    const [activePlan, setActivePlan] = useState<Plan | null>(null);
    const [mergedSettings, setMergedSettings] = useState<UserSettings>(defaultSettings);

    const [loadingGlobal, setLoadingGlobal] = useState(true);
    const [loadingUserSettings, setLoadingUserSettings] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState(true);

    useEffect(() => {
      // CORREÇÃO: Aponta para o documento 'main' dentro da coleção 'siteConfig'
      const settingsRef = doc(db, 'siteConfig', 'main');
      const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const newGlobalSettings: UserSettings = {
                ...defaultSettings,
                siteName: data.siteName || defaultSettings.siteName,
                iconName: data.iconName || defaultSettings.iconName,
                logoURL: data.logoURL === undefined ? defaultSettings.logoURL : data.logoURL,
                primaryColorHsl: data.primaryColorHsl || defaultSettings.primaryColorHsl,
                landingPageImages: { ...defaultSettings.landingPageImages, ...data.landingPageImages },
                featureFlags: { ...defaultSettings.featureFlags, ...data.featureFlags },
            };
            setGlobalSettings(newGlobalSettings);
        } else {
            setGlobalSettings(defaultSettings);
        }
        setLoadingGlobal(false);
      }, (error) => {
        console.error("Error fetching global settings:", error);
        setGlobalSettings(defaultSettings);
        setLoadingGlobal(false);
      });
      return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (!user) {
            setUserSettings({});
            setLoadingUserSettings(false);
            return;
        }

        setLoadingUserSettings(true);
        // CORREÇÃO: Aponta para a coleção raiz 'userSettings' com o ID do usuário
        const userSettingsRef = doc(db, 'userSettings', user.uid);

        const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
            // A lógica aqui dentro permanece a mesma, pois já espera um documento.
            const newUserSettings = docSnap.exists() ? docSnap.data() : {};
            setUserSettings(newUserSettings);
            setLoadingUserSettings(false);
        }, (error) => {
            console.error("Error fetching user settings:", error);
            setUserSettings({});
            setLoadingUserSettings(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!systemUser?.planId) {
            setActivePlan(null);
            setLoadingPlan(false);
            return;
        }

        setLoadingPlan(true);
        const planRef = doc(db, 'plans', systemUser.planId);
        const unsubscribe = onSnapshot(planRef, (docSnap) => {
            if (docSnap.exists()) {
                setActivePlan({ id: docSnap.id, ...docSnap.data() } as Plan);
            } else {
                console.warn("User's plan not found in database:", systemUser.planId);
                setActivePlan(null);
            }
            setLoadingPlan(false);
        }, (error) => {
            console.error("Error fetching user's plan:", error);
            setActivePlan(null);
            setLoadingPlan(false);
        });
        return () => unsubscribe();
    }, [systemUser?.planId]);

    useEffect(() => {
        if (loadingGlobal || loadingPlan || loadingUserSettings) return;

        // Inicia a mesclagem com a ordem de precedência correta: Padrão -> Global -> Usuário
        const merged: UserSettings = {
            ...defaultSettings,
            ...globalSettings,
            ...userSettings,
        };

        // Trata as propriedades aninhadas separadamente para garantir a mesclagem profunda
        merged.landingPageImages = {
            ...defaultSettings.landingPageImages,
            ...globalSettings.landingPageImages,
            ...userSettings.landingPageImages,
        };

        // Lógica de Feature Flags mesclando plano e configurações globais
        const finalFeatureFlags: FeatureFlags = { ...defaultSettings.featureFlags };
        const planFeatures: { [key: string]: boolean } = { ...finalFeatureFlags };

        if (activePlan?.features) {
            for (const key in planFeatures) {
                planFeatures[key] = !!activePlan.features[key as keyof typeof activePlan.features];
            }
        } else if (systemUser) { // Se não há plano, mas há usuário, assume que tem acesso
             for (const key in planFeatures) {
                planFeatures[key] = true;
            }
        }
        
        const globalFlags = globalSettings.featureFlags || {};

        for (const key in finalFeatureFlags) {
            const featureKey = key as keyof FeatureFlags;
            // A flag está ativa se não for explicitamente desativada no plano E não for explicitamente desativada globalmente
            finalFeatureFlags[featureKey] = (planFeatures[featureKey] !== false) && (globalFlags[featureKey] !== false);
        }

        merged.featureFlags = finalFeatureFlags;

        setMergedSettings(merged);

    }, [globalSettings, userSettings, activePlan, systemUser, loadingGlobal, loadingPlan, loadingUserSettings]);


    const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
        if (!user) throw new Error("User not authenticated to update settings.");
        
        const updatedSettings = { ...userSettings, ...newSettings };
        setUserSettings(updatedSettings);

        // CORREÇÃO: Aponta para a coleção raiz 'userSettings' com o ID do usuário
        const settingsRef = doc(db, 'userSettings', user.uid);
        try {
            // A escrita usa set com merge para criar o doc se não existir, ou atualizar se existir.
            await setDoc(settingsRef, newSettings, { merge: true });
        } catch(error) { 
            console.error("Failed to update user settings in Firestore", error);
            setUserSettings(userSettings);
        }
    }, [user, userSettings]);

    const loadingSettings = loadingGlobal || loadingPlan || loadingUserSettings;
    const value = { settings: mergedSettings, updateSettings, loading: loadingSettings };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
