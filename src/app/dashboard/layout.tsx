
'use client';

import { useAuth } from '@/components/auth-provider';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import DynamicLayoutEffects from '@/components/dynamic-layout-effects';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, systemUser, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Only apply subscription gatekeeping to regular users
    if (!isAdmin && systemUser) {
      // If user has no plan, redirect them to the subscription page to choose one.
      if (!systemUser.planId) {
        if (pathname !== '/dashboard/subscription') {
          router.push('/dashboard/subscription');
        }
        return; // Stop further checks
      }

      // If user has a plan but it's not active, also redirect to subscription management.
      if (systemUser.subscriptionStatus !== 'active') {
        if (pathname !== '/dashboard/subscription') {
          router.push('/dashboard/subscription');
        }
      }
    }

  }, [user, systemUser, isAdmin, loading, router, pathname]);

  // Show a loader while auth state is resolving for any user
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If a regular user is being redirected to subscription, show a loader to prevent content flash.
  if (!isAdmin && systemUser && (!systemUser.planId || systemUser.subscriptionStatus !== 'active') && pathname !== '/dashboard/subscription') {
     return (
       <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className='ml-4'>Verificando assinatura...</p>
      </div>
     )
  }

  // If all checks pass for a regular user or an admin, render the dashboard.
  return (
    <>
      <DynamicLayoutEffects />
      <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <DashboardSidebar />
        <div className="flex flex-col overflow-hidden">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/50 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
