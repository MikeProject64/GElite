
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { setDoc, doc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { createCheckoutSession } from './actions';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
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

  useEffect(() => {
    if (!planId) {
      toast({
        title: "Nenhum plano selecionado",
        description: "Você precisa escolher um plano para se cadastrar.",
        variant: 'destructive'
      });
      router.push('/#pricing');
    } else {
      setIsVerifying(false);
    }
  }, [planId, router, toast]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!planId) {
        toast({variant: 'destructive', title: 'Erro', description: 'Nenhum plano foi selecionado para o checkout.'});
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: Timestamp.now(),
        role: 'user',
        planId: planId,
        subscriptionStatus: 'incomplete',
      });

      // 3. Proceed to checkout
      const checkoutResult = await createCheckoutSession(planId, interval, user.uid);
      if (!checkoutResult.success || !checkoutResult.url) {
        throw new Error(checkoutResult.message || 'Não foi possível iniciar o pagamento.');
      }
      // Redirect to Stripe
      router.push(checkoutResult.url);

    } catch (error: any) {
      let errorMessage = 'Ocorreu um erro. Por favor, tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Falha no Cadastro',
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
        <CardTitle className="text-2xl font-headline">Último Passo!</CardTitle>
        <CardDescription>Crie sua conta para ativar a assinatura.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Continuar para o Pagamento'}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="underline hover:text-primary">
            Faça login
          </Link>
        </p>
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
