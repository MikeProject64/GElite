
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth-provider';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserSettings {
  siteName: string;
  iconName: string;
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  loadingSettings: boolean;
}

const defaultSettings: UserSettings = {
  siteName: 'ServiceWise',
  iconName: 'Wrench',
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
  loadingSettings: true,
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // This effect handles loading settings from localStorage on initial mount
  // and then fetching from Firestore, updating both state and localStorage.
  useEffect(() => {
    if (user) {
      setLoadingSettings(true);
      const storageKey = `servicewise-settings-${user.uid}`;

      // 1. Try to load from localStorage first for a faster UI update.
      try {
        const storedSettings = localStorage.getItem(storageKey);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
      } catch (e) {
        console.error("Could not read settings from localStorage", e);
      }

      // 2. Set up Firestore listener to get live updates.
      const settingsRef = doc(db, 'userSettings', user.uid);
      const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        const newSettings = docSnap.exists()
          ? { ...defaultSettings, ...docSnap.data() } as UserSettings
          : defaultSettings;
        
        setSettings(newSettings); // Update React state
        
        // 3. Persist the latest settings to localStorage.
        try {
          localStorage.setItem(storageKey, JSON.stringify(newSettings));
        } catch (e) {
          console.error("Could not save settings to localStorage", e);
        }
        
        setLoadingSettings(false);
      }, (error) => {
        console.error("Error fetching settings:", error);
        setSettings(defaultSettings);
        setLoadingSettings(false);
      });

      return () => unsubscribe();
    } else {
      // If there's no user, reset to default and finish loading.
      setSettings(defaultSettings);
      setLoadingSettings(false);
    }
  }, [user]);

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!user) throw new Error("User not authenticated to update settings.");
    const settingsRef = doc(db, 'userSettings', user.uid);
    // Let the onSnapshot listener handle updating state and localStorage
    // to maintain a single source of truth flow.
    await setDoc(settingsRef, newSettings, { merge: true });
  }, [user]);

  const value = { settings, updateSettings, loadingSettings };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
