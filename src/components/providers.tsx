'use client';

import { AuthProvider } from '@/components/auth-provider';
import { SettingsProvider } from '@/components/settings-provider';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as gtag from '@/lib/utils';

const AnalyticsTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      gtag.pageview(url);
    }
  }, [pathname, searchParams]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AnalyticsTracker />
        {children}
        <Toaster />
      </SettingsProvider>
    </AuthProvider>
  );
}
