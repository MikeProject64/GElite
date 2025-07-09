
'use client';

import { AuthProvider } from '@/components/auth-provider';
import { SettingsProvider } from '@/components/settings-provider';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode, useEffect, Suspense, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as gtag from '@/lib/utils';
import { ThemeProvider } from 'next-themes';

const AnalyticsTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollFiredRef = useRef(false);

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      gtag.pageview(url);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    // Track first visit
    try {
      const firstVisit = localStorage.getItem('first_visit_done_v1');
      if (!firstVisit) {
        gtag.event({ action: 'first_visit', params: {} });
        localStorage.setItem('first_visit_done_v1', 'true');
      }
    } catch (e) {
      console.warn("Could not access localStorage for analytics.");
    }

    // Track scroll on landing page
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight * 0.5 && !scrollFiredRef.current) {
        scrollFiredRef.current = true;
        gtag.event({ action: 'scroll', params: { scroll_depth: '50%' }});
        window.removeEventListener('scroll', handleScroll);
      }
    };

    if (pathname === '/') {
      scrollFiredRef.current = false;
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (pathname === '/') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [pathname]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
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
