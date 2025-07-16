
'use client';

import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading) {
      return; 
    }

    if (!user || !isAdmin) {
      if (pathname !== '/admin/login') {
        router.replace('/admin/login');
      }
    } else {
      if (pathname === '/admin/login') {
        router.replace('/admin/dashboard');
      }
    }
    // Set ready after checks are done
    setIsReady(true);

  }, [user, isAdmin, loading, router, pathname]);

  // Show a loading screen until authentication status is resolved and navigation is decided.
  if (loading || !isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // For the login page, render children directly without the sidebar layout.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // For all other admin pages, render the main dashboard layout with the sidebar.
  // The useEffect above already handles redirecting non-admins away.
  return (
    <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <AdminSidebar />
      <div className="flex flex-col overflow-hidden">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-secondary/50 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
