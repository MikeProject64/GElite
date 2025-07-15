
'use client';

import { useAuth } from '@/components/auth-provider';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import DynamicLayoutEffects from '@/components/dynamic-layout-effects';
import { TrialBanner } from '@/components/trial-banner';
import { VerificationBanner } from '@/components/dashboard/verification-banner';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WhatsAppSupportButton } from '@/components/whatsapp-support-button';
import { cn } from '@/lib/utils';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { useSettings } from '@/components/settings-provider';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, systemUser, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isAdmin && systemUser) {
      const isOnTrial = systemUser.subscriptionStatus === 'trialing' && systemUser.trialEndsAt && systemUser.trialEndsAt.toDate() > new Date();

      if (isOnTrial) {
        return; // User is on a valid trial, allow full access
      }
      
      if (!systemUser.planId) {
        if (pathname !== '/dashboard/plans') {
          router.push('/dashboard/plans');
        }
        return;
      }

      if (systemUser.subscriptionStatus !== 'active') {
        if (pathname !== '/dashboard/plans') {
          router.push('/dashboard/plans');
        }
      }
    }
  }, [user, systemUser, isAdmin, loading, router, pathname]);

  if (loading || !user || !isMounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAdmin && systemUser) {
    const isOnTrial = systemUser.subscriptionStatus === 'trialing' && systemUser.trialEndsAt && systemUser.trialEndsAt.toDate() > new Date();
    const hasActivePlan = systemUser.planId && systemUser.subscriptionStatus === 'active';
    const isSubscriptionPage = pathname === '/dashboard/plans';

    if (!isOnTrial && !hasActivePlan && !isSubscriptionPage) {
       return (
         <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className='ml-4'>Verificando assinatura...</p>
        </div>
       )
    }
  }

  return (
    <>
      <DynamicLayoutEffects />
      <WelcomeModal />
      <div className="flex flex-col h-screen bg-background">
        <header className="shrink-0 z-50">
          <TrialBanner />
          <VerificationBanner />
        </header>
        <div className="grid flex-1 w-full md:grid-cols-[auto_1fr] overflow-hidden">
          <DashboardSidebar />
          <main className="overflow-y-auto bg-secondary/50 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
      <WhatsAppSupportButton />
    </>
  );
}
