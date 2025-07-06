
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-provider';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';

export interface Tag {
  id: string;
  name: string;
  color: string; // Stores the Tailwind CSS class for the color
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
}

export interface UserSettings {
  siteName: string;
  iconName: string;
  logoURL?: string;
  primaryColorHsl?: { h: number; s: number; l: number; };
  customerCustomFields?: CustomField[];
  serviceOrderCustomFields?: CustomField[];
  quoteCustomFields?: CustomField[];
  serviceStatuses?: string[];
  tags?: Tag[];
  featureFlags?: {
    servicos?: boolean;
    orcamentos?: boolean;
    prazos?: boolean;
    atividades?: boolean;
    clientes?: boolean;
    colaboradores?: boolean;
    inventario?: boolean;
  };
  landingPageImages?: {
    heroImage?: string;
    feature1Image?: string;
    feature2Image?: string;
    feature3Image?: string;
    galleryImages?: string[];
  };
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  loadingSettings: boolean;
}

const defaultSettings: UserSettings = {
  siteName: 'ServiceWise',
  iconName: 'Wrench',
  primaryColorHsl: { h: 210, s: 70, l: 40 },
  customerCustomFields: [],
  serviceOrderCustomFields: [],
  quoteCustomFields: [],
  serviceStatuses: ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'],
  tags: [],
  featureFlags: {
    servicos: true,
    orcamentos: true,
    prazos: true,
    atividades: true,
    clientes: true,
    colaboradores: true,
    inventario: true,
  },
  landingPageImages: {
    heroImage: 'https://placehold.co/600x550.png',
    feature1Image: 'https://placehold.co/550x450.png',
    feature2Image: 'https://placehold.co/550x450.png',
    feature3Image: 'https://placehold.co/550x450.png',
    galleryImages: Array(9).fill('https://placehold.co/600x400.png'),
  },
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
  loadingSettings: true,
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user, systemUser } = useAuth();
  
  const [globalSettings, setGlobalSettings] = useState<UserSettings>(defaultSettings);
  const [userSettings, setUserSettings] = useState<Partial<UserSettings>>({});
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [mergedSettings, setMergedSettings] = useState<UserSettings>(defaultSettings);
  
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Effect to fetch global settings
  useEffect(() => {
    setLoadingGlobal(true);
    const settingsRef = doc(db, 'siteConfig', 'main');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      const newGlobalSettings = docSnap.exists()
        ? { ...defaultSettings, ...docSnap.data() }
        : defaultSettings;
      setGlobalSettings(newGlobalSettings);
      setLoadingGlobal(false);
    }, (error) => {
      console.error("Error fetching global settings:", error);
      setGlobalSettings(defaultSettings);
      setLoadingGlobal(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to fetch user-specific settings (for appearance)
  useEffect(() => {
    if (user) {
      const storageKey = `servicewise-settings-${user.uid}`;
      try {
        const storedSettings = localStorage.getItem(storageKey);
        if (storedSettings) {
          setUserSettings(JSON.parse(storedSettings));
        }
      } catch (e) {
        console.error("Could not read user settings from localStorage", e);
      }

      const userSettingsRef = doc(db, 'userSettings', user.uid);
      const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
        const newUserSettings = docSnap.exists() ? docSnap.data() : {};
        setUserSettings(newUserSettings);
        try {
          localStorage.setItem(storageKey, JSON.stringify(newUserSettings));
        } catch (e) {
          console.error("Could not save user settings to localStorage", e);
        }
      });
      return () => unsubscribe();
    } else {
      setUserSettings({}); // Clear user settings on logout
    }
  }, [user]);

  // Effect to fetch the user's active plan
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

  // Effect to merge all settings
  useEffect(() => {
    const finalSettings: UserSettings = {
      ...globalSettings,
      ...userSettings,
    };

    const finalFeatureFlags: UserSettings['featureFlags'] = { ...defaultSettings.featureFlags };
    const globalFlags = globalSettings.featureFlags || {};
    const planFeatures = activePlan?.features || {};

    for (const key in finalFeatureFlags) {
        const flagKey = key as keyof typeof finalFeatureFlags;
        finalFeatureFlags[flagKey] = !!(globalFlags[flagKey] && planFeatures[flagKey]);
    }
    finalSettings.featureFlags = finalFeatureFlags;

    setMergedSettings(finalSettings);
  }, [globalSettings, userSettings, activePlan]);


  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!user) throw new Error("User not authenticated to update settings.");
    
    const updatedSettings = { ...userSettings, ...newSettings };
    setUserSettings(updatedSettings);

    const storageKey = `servicewise-settings-${user.uid}`;
    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
    } catch (e) {
        console.error("Could not optimistic update to localStorage", e);
    }
    
    const settingsRef = doc(db, 'userSettings', user.uid);
    try {
        await setDoc(settingsRef, newSettings, { merge: true });
    } catch(error) {
        console.error("Failed to update user settings in Firestore", error);
    }
  }, [user, userSettings]);

  const loadingSettings = loadingGlobal || loadingPlan;
  const value = { settings: mergedSettings, updateSettings, loadingSettings };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
