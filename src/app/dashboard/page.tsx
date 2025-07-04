'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isTestingDb, setIsTestingDb] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleTestDatabase = async () => {
    if (!user) return;
    setIsTestingDb(true);
    try {
      await setDoc(doc(db, "test_runs", user.uid), {
        userEmail: user.email,
        lastTestTimestamp: serverTimestamp(),
        message: "Conexão com o banco de dados bem-sucedida!",
      });

      toast({
        title: "Sucesso!",
        description: "Dados de teste gravados no Firestore. Verifique seu console do Firebase.",
      });
    } catch (error: any) {
      console.error("Erro detalhado ao gravar no Firestore:", error);
      let description = "Não foi possível gravar os dados de teste. Verifique o console para mais detalhes.";
      
      if (error.code === 'permission-denied') {
        description = "Permissão negada. Isso geralmente significa que as Regras de Segurança do Firestore estão incorretas OU a API do Cloud Firestore não está ativada no seu projeto. Verifique ambos.";
      }
      
      toast({
        variant: "destructive",
        title: "Erro de Permissão no Firestore",
        description: description,
      });
    } finally {
      setIsTestingDb(false);
    }
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
          
          <Button onClick={handleTestDatabase} variant="outline" className="w-full" disabled={isTestingDb}>
            {isTestingDb ? <Loader2 className="animate-spin" /> : 'Testar Conexão com Banco de Dados'}
          </Button>

          <Button onClick={handleLogout} variant="destructive" className="w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
