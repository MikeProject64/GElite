'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';

export function Header() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">ServiceWise</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                  Painel
                </Button>
                <Button onClick={handleLogout}>Sair</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push('/login')}>
                  Login
                </Button>
                <Button onClick={() => router.push('/signup')}>Cadastre-se</Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
