'use client';

import { AuthProvider } from '@/components/auth-provider';
import { SettingsProvider } from '@/components/settings-provider';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        {children}
        <Toaster />
      </SettingsProvider>
    </AuthProvider>
  );
}
