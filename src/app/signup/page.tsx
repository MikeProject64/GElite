
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createCheckoutSession } from './actions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planId = searchParams.get('planId');
  const interval = searchParams.get('interval') as 'month' | 'year' | null || 'month';
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const verifyPlan = async () => {
        if (!planId) {
            toast({
                title: "Nenhum plano selecionado",
                description: "Você será redirecionado para escolher um plano.",
                variant: 'destructive'
            });
            router.push('/#pricing');
            return;
        }

        const planRef = doc(db, 'plans', planId);
        const planSnap = await getDoc(planRef);
        if (!planSnap.exists()) {
            toast({
                title: "Plano inválido",
                description: "O plano selecionado não existe. Escolha outro.",
                variant: 'destructive'
            });
            router.push('/#pricing');
            return;
        }

        setSelectedPlan({ id: planSnap.id, ...planSnap.data() } as Plan);
        setIsVerifying(false);
    }
    verifyPlan();
  }, [planId, router, toast]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!planId) {
        toast({variant: 'destructive', title: 'Erro', description: 'Nenhum plano foi selecionado para o checkout.'});
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const checkoutResult = await createCheckoutSession(planId, interval, values.email);
      if (!checkoutResult.success || !checkoutResult.url) {
        throw new Error(checkoutResult.message || 'Não foi possível iniciar o pagamento.');
      }
      // Redirect to Stripe
      router.push(checkoutResult.url);

    } catch (error: any) {
      const errorMessage = error.message || 'Ocorreu um erro. Por favor, tente novamente.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Falha no Processo',
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Verificando plano...</CardTitle>
          <CardDescription>Aguarde um momento...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Iniciando Assinatura</CardTitle>
        <CardDescription>Você está assinando o plano <span className='font-bold text-primary'>{selectedPlan?.name}</span>. Por favor, insira seu e-mail para continuar para o pagamento.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu melhor e-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Ir para o Pagamento'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-background p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <SignupForm />
            </Suspense>
        </main>
    );
}
