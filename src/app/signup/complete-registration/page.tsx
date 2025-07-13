
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Rocket } from 'lucide-react';
import { verifyCheckoutAndCreateUser } from './actions';
import * as gtag from '@/lib/utils';
import Link from 'next/link';

function CompleteRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (status !== 'verifying') return;

    if (!sessionId) {
      toast({ title: 'Erro', description: 'ID de sessão inválido.', variant: 'destructive' });
      router.push('/#pricing');
      return;
    }

    const completeRegistration = async () => {
        const result = await verifyCheckoutAndCreateUser(sessionId);

        if (!result.success || !result.email) {
            setErrorMessage(result.message || 'Ocorreu uma falha desconhecida.');
            setStatus('error');
            return;
        }
        
        if (result.value && result.currency && result.transaction_id && result.planId && result.planName) {
            gtag.event({ action: "purchase", params: {
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
        
        setStatus('success');
    };

    completeRegistration();

  }, [sessionId, router, toast, status]);


  if (status === 'verifying') {
     return (
        <Card className="w-full max-w-sm">
            <CardHeader className='items-center text-center'>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <CardTitle className="text-2xl font-headline">Verificando Pagamento...</CardTitle>
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
        <CardTitle className="text-2xl font-headline">Pagamento Confirmado!</CardTitle>
        <CardDescription>
            Sua conta foi criada! Enviamos um e-mail com um link para você definir sua senha e acessar o painel. Verifique sua caixa de entrada e spam.
        </CardDescription>
      </CardHeader>
      <CardContent className='text-center'>
        <Button className='w-full mt-4' asChild>
          <Link href="/login">Ir para a Página de Login</Link>
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
