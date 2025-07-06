
'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { availableIcons } from './icon-map';
import { Wrench } from 'lucide-react';

interface HeaderProps {
    siteName?: string;
    iconName?: string;
}

export function Header({ siteName = "Gestor Elite", iconName = "Wrench" }: HeaderProps) {
  const { user } = useAuth();
  const router = useRouter();

  const Icon = availableIcons[iconName as keyof typeof availableIcons] || Wrench;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6 lg:px-24">
        <div className="mr-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-bold text-base">{siteName}</span>
          </Link>
        </div>
        <nav>
          {user ? (
            <div className="flex items-center space-x-2">
              <Button onClick={() => router.push('/dashboard')}>
                Acessar Painel
              </Button>
              <Button variant="ghost" onClick={handleLogout}>Sair</Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
              Entrar
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
