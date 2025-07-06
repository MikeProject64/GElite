'use client';

import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth state to be determined

    if (!user) {
      // Not logged in, redirect to admin login
      router.push('/admin/login');
      return;
    }

    if (!isAdmin) {
      // Logged in but not an admin, redirect to their user dashboard
      router.push('/dashboard');
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !isAdmin) {
    // Show a loading screen while we verify the user's role
    // or while redirecting.
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we reach here, user is an admin and can see the content.
  return <>{children}</>;
}