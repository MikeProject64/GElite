
'use client';

import { useAuth } from '@/components/auth-provider';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import DynamicLayoutEffects from '@/components/dynamic-layout-effects';
import { TrialBanner } from '@/components/trial-banner';
import { Loader2, ChevronsLeft, Menu } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WhatsAppSupportButton } from '@/components/whatsapp-support-button';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
      <TrialBanner />
      <div className={cn("h-screen w-full flex", isOnTrial && "pt-12")}>
        <div className="hidden md:block">
            <DashboardSidebar isCollapsed={isCollapsed} />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col p-0">
                            <DashboardSidebar isCollapsed={false} isMobile={true} />
                        </SheetContent>
                    </Sheet>
                </div>
                <Button onClick={toggleSidebar} variant="outline" size="icon" className="h-8 w-8 hidden md:flex">
                    <ChevronsLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
                </Button>
            </header>
            <main className="flex-1 overflow-y-auto bg-secondary/50 p-4 lg:p-6">
              {children}
            </main>
        </div>
      </div>
      <WhatsAppSupportButton />
    </>
  );
}
