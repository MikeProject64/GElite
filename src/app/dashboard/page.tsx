'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Bem-vindo ao seu Painel</CardTitle>
          <CardDescription>Aqui você pode gerenciar suas operações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-body">
            Você está logado como: <span className="font-bold text-primary">{user.email}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            Este é um espaço seguro. Em breve, adicionaremos mais funcionalidades aqui, como o gerenciamento de suas ordens de serviço.
          </p>
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
