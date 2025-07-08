
'use client';

import { AuthProvider } from '@/components/auth-provider';
import { SettingsProvider } from '@/components/settings-provider';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as gtag from '@/lib/utils';
import { ThemeProvider } from 'next-themes';

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
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <SettingsProvider>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          {children}
          <Toaster />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
