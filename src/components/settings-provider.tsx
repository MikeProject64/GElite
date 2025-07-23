

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
      const settingsRef = doc(db, 'settings', 'global');
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
        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'user');
        const storageKey = `gestor-elite-settings-${user.uid}`;
        
        try {
            const storedSettings = localStorage.getItem(storageKey);
            if (storedSettings) {
                setUserSettings(JSON.parse(storedSettings));
            }
        } catch (e) {
            console.error("Could not read user settings from localStorage", e);
        }

        const unsubscribe = onSnapshot(userSettingsRef, (docSnap) => {
            const newUserSettings = docSnap.exists() ? docSnap.data() : {};
            setUserSettings(newUserSettings);
            try {
                localStorage.setItem(storageKey, JSON.stringify(newUserSettings));
            } catch (e) {
                console.error("Could not write user settings to localStorage", e);
            }
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

        const finalFeatureFlags: FeatureFlags = { ...defaultSettings.featureFlags };

        const planFeatures: { [key: string]: boolean } = { ...finalFeatureFlags };
        if (activePlan && activePlan.features) {
            for (const key in planFeatures) {
                planFeatures[key] = !!activePlan.features[key as keyof typeof activePlan.features];
            }
        } else if (systemUser) {
            for (const key in planFeatures) {
                planFeatures[key] = true;
            }
        }
        
        const globalFlags = globalSettings.featureFlags || {};

        for (const key in finalFeatureFlags) {
            const featureKey = key as keyof FeatureFlags;
            finalFeatureFlags[featureKey] = (planFeatures[featureKey] !== false) && (globalFlags[featureKey] !== false);
        }

        const merged: UserSettings = {
            ...defaultSettings,
            ...globalSettings,
            ...userSettings,
            landingPageImages: {
                ...defaultSettings.landingPageImages,
                ...globalSettings.landingPageImages,
                ...userSettings.landingPageImages,
            },
            featureFlags: finalFeatureFlags,
        };

        setMergedSettings(merged);

    }, [globalSettings, userSettings, activePlan, systemUser, loadingGlobal, loadingPlan, loadingUserSettings]);


    const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
        if (!user) throw new Error("User not authenticated to update settings.");
        
        const updatedSettings = { ...userSettings, ...newSettings };
        setUserSettings(updatedSettings);

        const storageKey = `gestor-elite-settings-${user.uid}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
        } catch(error) {
            console.error("Failed to update user settings in localStorage", error);
        }
        
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'user');
        try {
            await setDoc(settingsRef, newSettings, { merge: true });
        } catch(error) { console.error("Failed to update user settings in Firestore", error); }
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
