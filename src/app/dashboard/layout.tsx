
'use client';

import { useAuth } from '@/components/auth-provider';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import DynamicLayoutEffects from '@/components/dynamic-layout-effects';
import { TrialBanner } from '@/components/trial-banner';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WhatsAppSupportButton } from '@/components/whatsapp-support-button';
import { cn } from '@/lib/utils';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, systemUser, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

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
        if (pathname !== '/dashboard/subscription') {
          router.push('/dashboard/subscription');
        }
        return;
      }

      if (systemUser.subscriptionStatus !== 'active') {
        if (pathname !== '/dashboard/subscription') {
          router.push('/dashboard/subscription');
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
    const isSubscriptionPage = pathname === '/dashboard/subscription';

    if (!isOnTrial && !hasActivePlan && !isSubscriptionPage) {
       return (
         <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className='ml-4'>Verificando assinatura...</p>
        </div>
       )
    }
  }

  const isOnTrial = systemUser?.subscriptionStatus === 'trialing' && systemUser.trialEndsAt && systemUser.trialEndsAt.toDate() > new Date();

  return (
    <>
      <DynamicLayoutEffects />
      <WelcomeModal />
      <TrialBanner />
      <div className={cn("grid h-screen w-full md:grid-cols-[auto_1fr]", isOnTrial && "pt-12")}>
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto bg-secondary/50 p-4 lg:p-6">
          {children}
        </main>
      </div>
      <WhatsAppSupportButton />
    </>
  );
}
