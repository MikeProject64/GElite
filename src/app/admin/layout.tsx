
'use client';

import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AdminSidebar } from '@/components/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This effect handles the redirection logic.
    // It will run after the initial render and whenever dependencies change.
    if (loading) {
      return; // Don't do anything while auth state is resolving
    }

    if (user && isAdmin) {
      // If a logged-in admin is on the login page, redirect to dashboard
      if (pathname === '/admin/login') {
        router.replace('/admin/dashboard');
      }
    } else {
      // If a user is not an admin (or not logged in) and tries to access a protected admin page
      if (pathname !== '/admin/login') {
        router.replace('/admin/login');
      }
    }
  }, [user, isAdmin, loading, router, pathname]);

  // This block determines what to render based on the current state.
  
  // 1. Show a loader if auth state is still loading.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. If the user is an admin and is on the login page, they are about to be redirected.
  // Show a loader to prevent the login page from "flashing" on the screen.
  if (isAdmin && pathname === '/admin/login') {
     return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // 3. If the user is a confirmed admin and NOT on the login page, show the admin layout.
  if (isAdmin && pathname !== '/admin/login') {
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

  // 4. In all other cases (e.g., user is not an admin, or is on the login page while not authenticated),
  // just render the children. This covers the login page itself and the brief period during redirection
  // for non-admin users, where we want the UI to be blank before showing the login screen.
  return <>{children}</>;
}
