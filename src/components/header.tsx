
'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { availableIcons } from './icon-map';
import { Wrench } from 'lucide-react';
import React from 'react';

interface HeaderProps {
    siteName?: string;
    iconName?: string;
}

const navLinks = [
    { href: '/#features', label: 'Funcionalidades' },
    { href: '/#benefits', label: 'Benefícios' },
    { href: '/#pricing', label: 'Planos' },
    { href: '/#faq', label: 'FAQ' },
];

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
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-bold text-base">{siteName}</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground ml-auto mr-4">
            {navLinks.map((link, index) => (
                <React.Fragment key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-primary">
                        {link.label}
                    </Link>
                    {index < navLinks.length - 1 && (
                         <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                    )}
                </React.Fragment>
            ))}
        </nav>

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
