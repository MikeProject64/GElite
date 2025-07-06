
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

  // If we are on the login page, we don't need any of the auth protection.
  // Just render the login form.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // This effect handles protection for all OTHER admin pages.
  useEffect(() => {
    if (loading) return; // Don't do anything while loading.

    if (!user) {
      // If not logged in, and not on the login page, redirect to login.
      router.push('/admin/login');
      return;
    }

    if (!isAdmin) {
      // If logged in but not an admin, redirect to the user dashboard.
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  // This loader will show for all protected admin pages while auth is loading,
  // or briefly before the redirect happens.
  if (loading || !user || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If all checks pass, render the protected admin layout.
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
