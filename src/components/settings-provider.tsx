
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

  useEffect(() => {
    if (user) {
      setLoadingSettings(true);
      const settingsRef = doc(db, 'userSettings', user.uid);
      const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
          setSettings({ ...defaultSettings, ...docSnap.data() } as UserSettings);
        } else {
          setSettings(defaultSettings);
        }
        setLoadingSettings(false);
      }, (error) => {
        console.error("Error fetching settings:", error);
        setSettings(defaultSettings);
        setLoadingSettings(false);
      });
      return () => unsubscribe();
    } else {
      setSettings(defaultSettings);
      setLoadingSettings(false);
    }
  }, [user]);

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!user) throw new Error("User not authenticated to update settings.");
    const settingsRef = doc(db, 'userSettings', user.uid);
    // We only need to write to the DB. The onSnapshot listener will update the local state.
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
