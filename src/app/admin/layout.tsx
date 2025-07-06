
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
    if (loading) {
      return; // Wait until loading state is resolved
    }

    if (user && isAdmin) {
      // If the admin is on the login page, redirect them away to the dashboard
      if (pathname === '/admin/login') {
        router.push('/admin/dashboard');
      }
    } else {
      // If the user is NOT an admin (or not logged in)
      // and they are NOT on the login page, redirect them away to the login page.
      if (pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    }
  }, [user, isAdmin, loading, router, pathname]);

  // Display a global loader while authentication is in progress or during redirects.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is a confirmed admin and is NOT on the login page, show the admin layout.
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

  // In all other cases (e.g., user is not an admin, or is on the login page while not authenticated),
  // just render the children without the admin sidebar. This covers the login page itself
  // and the brief period during redirection.
  return <>{children}</>;
}
