'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export function AdminPanelButton() {
  const { isAdmin, loading } = useAuth();

  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Button
      asChild
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 animate-pulse hover:animate-none"
      aria-label="Acessar Painel do Administrador"
      title="Acessar Painel do Administrador"
    >
      <Link href="/admin/dashboard">
        <Settings className="h-7 w-7" />
      </Link>
    </Button>
  );
}
