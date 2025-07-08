
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, systemUser, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedState = localStorage.getItem('sidebar-collapsed');
    if (storedState) {
      setIsCollapsed(JSON.parse(storedState));
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prevState => {
      const newState = !prevState;
      localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
      return newState;
    });
  };

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
      
      // If user has no plan (e.g., trial expired), redirect to subscription page.
      if (!systemUser.planId) {
        if (pathname !== '/dashboard/subscription') {
          router.push('/dashboard/subscription');
        }
        return;
      }

      // If user has a plan but it's not active, also redirect to subscription management.
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

    // If user is not on trial and doesn't have an active plan, show loader while redirecting
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
      <TrialBanner />
      <div className={cn(
        "grid h-screen w-full transition-all duration-300 ease-in-out",
        isCollapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]",
        isOnTrial && "pt-14"
      )}>
        <DashboardSidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
        <div className="flex flex-col overflow-hidden">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/50 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      <WhatsAppSupportButton />
    </>
  );
}
