
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Rocket } from 'lucide-react';
import { verifyCheckoutAndCreateUser } from './actions';
import * as gtag from '@/lib/utils';

function CompleteRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'verifying' | 'creating' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (status !== 'verifying') return;

    if (!sessionId) {
      toast({ title: 'Erro', description: 'ID de sessão inválido.', variant: 'destructive' });
      router.push('/#pricing');
      return;
    }

    const completeRegistration = async () => {
        setStatus('creating');
        const name = localStorage.getItem('signup_name');
        const email = localStorage.getItem('signup_email');
        const password = localStorage.getItem('signup_password');

        if (!name || !email || !password) {
            setErrorMessage('Dados de cadastro não encontrados. Por favor, tente novamente.');
            setStatus('error');
            return;
        }

        const result = await verifyCheckoutAndCreateUser(sessionId, name, password);

        if (!result.success || !result.email) {
            setErrorMessage(result.message || 'Ocorreu uma falha desconhecida.');
            setStatus('error');
            return;
        }
        
        // Fire GA4 event for purchase
        if (result.value && result.currency && result.transaction_id && result.planId && result.planName) {
            gtag.event({ action: "Assinatura_Plano_Gestor_Elite", params: {
                transaction_id: result.transaction_id,
                value: result.value,
                currency: result.currency,
                items: [{
                    item_id: result.planId,
                    item_name: result.planName,
                    price: result.value,
                    quantity: 1
                }]
            }});
        }

        // Cleanup localStorage
        localStorage.removeItem('signup_name');
        localStorage.removeItem('signup_email');
        localStorage.removeItem('signup_password');
        
        // Log user in
        await signInWithEmailAndPassword(auth, result.email, password);
        setStatus('success');
    };

    completeRegistration();

  }, [sessionId, router, toast, status]);

  useEffect(() => {
    if (status === 'success') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        router.push('/dashboard');
      }
    }
  }, [status, countdown, router]);


  if (status === 'verifying' || status === 'creating') {
     return (
        <Card className="w-full max-w-sm">
            <CardHeader className='items-center text-center'>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <CardTitle className="text-2xl font-headline">
                    {status === 'verifying' ? 'Verificando Pagamento...' : 'Criando sua Conta...'}
                </CardTitle>
                <CardDescription>Aguarde um momento, estamos finalizando tudo para você.</CardDescription>
            </CardHeader>
        </Card>
     );
  }

  if (status === 'error') {
     return (
        <Card className="w-full max-w-sm">
            <CardHeader className='items-center text-center'>
                <CheckCircle className='h-12 w-12 text-destructive' />
                <CardTitle className="text-2xl font-headline">Ocorreu um Erro</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
             <CardContent>
                <Button className='w-full' onClick={() => router.push('/#pricing')}>Voltar para Planos</Button>
            </CardContent>
        </Card>
     );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Rocket className='h-12 w-12 text-green-500' />
        <CardTitle className="text-2xl font-headline">Tudo Pronto!</CardTitle>
        <CardDescription>Sua conta foi criada e sua assinatura está ativa. Bem-vindo(a)!</CardDescription>
      </CardHeader>
      <CardContent className='text-center'>
        <p className='text-sm text-muted-foreground'>Você será redirecionado em {countdown} segundos...</p>
        <Button className='w-full mt-4' onClick={() => router.push('/dashboard')}>
          Acessar Agora
        </Button>
      </CardContent>
    </Card>
  );
}


export default function CompleteRegistrationPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-secondary p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <CompleteRegistrationContent />
            </Suspense>
        </main>
    );
}
