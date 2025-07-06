
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
    // This effect should only handle redirection after the loading is complete.
    if (loading) {
      return;
    }

    // If we are not on the login page...
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

  // Handle the login page separately, it doesn't need protection or a sidebar.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // For any other admin page, show a loader until the auth state is resolved.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // After loading, if the user is an admin, show the layout.
  // If they are not, the useEffect above will have already initiated a redirect,
  // but we also prevent flashing the content by checking here.
  if (isAdmin) {
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

  // Fallback loader while the redirect is in progress for non-admins.
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
