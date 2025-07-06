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
      return; // Wait until loading is finished
    }

    // If we are on any page other than the login page...
    if (pathname !== '/admin/login') {
      if (!user) {
        // ...and there's no user, redirect to login.
        router.push('/admin/login');
      } else if (!isAdmin) {
        // ...and the user is not an admin, redirect to the user dashboard.
        router.push('/dashboard');
      }
    }
  }, [user, isAdmin, loading, router, pathname]);

  // If it's the login page, render it without the admin layout.
  // The useEffect above won't trigger any redirects from the login page.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // For all other admin pages:
  // If still loading, or if not an admin (which covers the redirecting state),
  // show a loader to prevent content flashing and to cover the redirection time.
  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is complete and the user is a confirmed admin, render the full admin layout.
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
