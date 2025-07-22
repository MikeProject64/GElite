

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-provider';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan, ServiceStatus } from '@/types';

export interface Tag {
  id: string;
  name: string;
  color: string; // Stores the Tailwind CSS class for the color
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'currency';
}

export interface UserSettings {
  siteName: string;
  iconName: string;
  logoURL?: string;
  primaryColorHsl?: { h: number; s: number; l: number; };
  customerCustomFields?: CustomField[];
  serviceOrderCustomFields?: CustomField[];
  quoteCustomFields?: CustomField[];
  serviceStatuses?: ServiceStatus[];
  tags?: Tag[];
  serviceTypes?: { id: string; name: string }[]; // Adicionado para tipos de serviço
  featureFlags?: {
    servicos?: boolean;
    orcamentos?: boolean;
    prazos?: boolean;
    atividades?: boolean;
    clientes?: boolean;
    colaboradores?: boolean;
    inventario?: boolean;
    contratos?: boolean; // Novo
  };
  landingPageImages?: {
    heroImage?: string;
    feature1Image?: string;
    feature2Image?: string;
    feature3Image?: string;
    galleryImages?: string[];
    testimonial1Image?: string;
    testimonial2Image?: string;
    testimonial3Image?: string;
  };
  whatsappNumber?: string;
  whatsappMessage?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  emailRecipients?: string[];
  notifyOnNewSubscription?: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  whatsAppBusinessAccountId?: string;
  whatsAppAccessToken?: string;
  ga4PropertyId?: string;
  ga4CredentialsJson?: string;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  loadingSettings: boolean;
}

const defaultSettings: UserSettings = {
  siteName: 'Gestor Elite',
  iconName: 'Wrench',
  primaryColorHsl: { h: 210, s: 70, l: 40 },
  customerCustomFields: [],
  serviceOrderCustomFields: [],
  quoteCustomFields: [],
  serviceStatuses: [
    { id: 'pending', name: 'Pendente', color: '48 96% 58%' }, // yellow
    { id: 'in_progress', name: 'Em Andamento', color: '210 70% 60%' }, // blue
    { id: 'completed', name: 'Concluída', color: '142 69% 51%' }, // green
    { id: 'canceled', name: 'Cancelada', color: '0 84% 60%' }, // red
  ],
  tags: [],
  serviceTypes: [], // Adicionado para tipos de serviço
  featureFlags: {
    servicos: true,
    orcamentos: true,
    prazos: true,
    atividades: true,
    clientes: true,
    colaboradores: true,
    inventario: true,
    contratos: true, // Novo
  },
  landingPageImages: {
    heroImage: 'https://placehold.co/600x550.png',
    feature1Image: 'https://placehold.co/550x450.png',
    feature2Image: 'https://placehold.co/550x450.png',
    feature3Image: 'https://placehold.co/550x450.png',
    galleryImages: Array(9).fill('https://placehold.co/600x400.png'),
    testimonial1Image: 'https://placehold.co/100x100.png',
    testimonial2Image: 'https://placehold.co/100x100.png',
    testimonial3Image: 'https://placehold.co/100x100.png',
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
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure serviceStatuses is an array of objects
        if (data.serviceStatuses && Array.isArray(data.serviceStatuses) && typeof data.serviceStatuses[0] === 'string') {
            data.serviceStatuses = defaultSettings.serviceStatuses;
        }
        
        const newGlobalSettings = {
          ...defaultSettings,
          ...data,
          landingPageImages: {
            ...defaultSettings.landingPageImages,
            ...data.landingPageImages,
          },
          featureFlags: {
            ...defaultSettings.featureFlags,
            ...data.featureFlags,
          },
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

  // Effect to fetch user-specific settings (for appearance)
  useEffect(() => {
    if (user) {
      const storageKey = `gestor-elite-settings-${user.uid}`;
      try {
        const storedSettings = localStorage.getItem(storageKey);
        if (storedSettings) {
          setUserSettings(JSON.parse(storedSettings));
        }
      } catch (e) { console.error("Could not read user settings from localStorage", e); }

      const userSettingsRef = doc(db, 'userSettings', user.uid);
      const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
        const newUserSettings = docSnap.exists() ? docSnap.data() : {};
        setUserSettings(newUserSettings);
        try {
          localStorage.setItem(storageKey, JSON.stringify(newUserSettings));
        } catch (e) { console.error("Could not save user settings to localStorage", e); }
      });
      return () => unsubscribe();
    } else {
      setUserSettings({});
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

  // Effect to merge all settings and determine feature flags
  useEffect(() => {
    // Forçar nome e ícone globais do admin
    const baseSettings: UserSettings = {
      ...globalSettings,
      siteName: globalSettings.siteName,
      iconName: globalSettings.iconName,
    };
    // Initialize final flags with all features disabled by default
    const finalFeatureFlags: UserSettings['featureFlags'] = { ...defaultSettings.featureFlags };
    for (const key in finalFeatureFlags) {
        (finalFeatureFlags as any)[key] = false;
    }

    // Determine which features the user's plan allows
    const planFeatures: { [key: string]: boolean } = { ...finalFeatureFlags };
    if (activePlan) {
        for (const key in planFeatures) {
            planFeatures[key] = !!activePlan.features[key as keyof typeof activePlan.features];
        }
    } else if (systemUser) { // System user has all features
        for (const key in planFeatures) {
            planFeatures[key] = true;
        }
    }
    
    // Get global flags set by the admin
    const globalFlags = globalSettings.featureFlags || {};

    // A feature is active only if both the plan and the global settings allow it
    for (const key in finalFeatureFlags) {
        const flagKey = key as keyof typeof finalFeatureFlags;
        const isPlanAllowed = planFeatures[flagKey];
        const isGlobalAllowed = globalFlags[flagKey] !== false; // Consider it allowed unless explicitly false
        finalFeatureFlags[flagKey] = isPlanAllowed && isGlobalAllowed;
    }

    baseSettings.featureFlags = finalFeatureFlags;
    setMergedSettings(baseSettings);

  }, [globalSettings, userSettings, activePlan, systemUser]);


  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!user) throw new Error("User not authenticated to update settings.");
    
    const updatedSettings = { ...userSettings, ...newSettings };
    setUserSettings(updatedSettings);

    const storageKey = `gestor-elite-settings-${user.uid}`;
    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
    } catch (e) { console.error("Could not optimistic update to localStorage", e); }
    
    const settingsRef = doc(db, 'userSettings', user.uid);
    try {
        await setDoc(settingsRef, newSettings, { merge: true });
    } catch(error) { console.error("Failed to update user settings in Firestore", error); }
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
