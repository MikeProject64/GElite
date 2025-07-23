
'use client';

import { useAuth } from '@/components/auth-provider';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import DynamicLayoutEffects from '@/components/dynamic-layout-effects';
import { TrialBanner } from '@/components/trial-banner';
import { VerificationBanner } from '@/components/dashboard/verification-banner';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// import { WhatsAppSupportButton } from '@/components/whatsapp-support-button';
import { cn } from '@/lib/utils';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { SettingsProvider, useSettings } from '@/components/settings-provider';


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { systemUser, isAdmin, isTeamMember } = useAuth();
  const { settings } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
     // Se for membro da equipe, não fazemos nenhuma verificação de plano/assinatura aqui.
     if (isTeamMember) {
       return;
     }

     if (!isAdmin && systemUser) {
      const isOnTrial = systemUser.subscriptionStatus === 'trialing' && systemUser.trialEndsAt && systemUser.trialEndsAt.toDate() > new Date();

      if (isOnTrial) {
        return; 
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
  }, [systemUser, isAdmin, isTeamMember, router, pathname]);

  // A tela de "Verificando assinatura..." também precisa ignorar os membros da equipe.
  if (!isAdmin && !isTeamMember && systemUser) {
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
      <div className="flex flex-col h-screen bg-background">
        <header className="shrink-0 z-50">
          <TrialBanner />
          <VerificationBanner />
        </header>
        <div className="flex flex-row flex-1 w-full overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 overflow-y-auto bg-secondary/50 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
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
  }, [user, loading, router]);

  if (loading || !user || !isMounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SettingsProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SettingsProvider>
  );
}
