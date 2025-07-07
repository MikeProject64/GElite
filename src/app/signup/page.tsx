
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
import { Loader2, ShieldCheck } from 'lucide-react';
import { createCheckoutSession, checkEmailExists } from './actions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formSchema = z.object({
  name: z.string().min(3, { message: 'O nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});


function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const planId = searchParams.get('planId');
  const interval = searchParams.get('interval') as 'month' | 'year' | null || 'month';
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const verifyPlan = async () => {
        if (!planId) {
            toast({ title: "Nenhum plano selecionado", description: "Você será redirecionado para escolher um plano.", variant: 'destructive'});
            router.push('/#pricing');
            return;
        }
        const planRef = doc(db, 'plans', planId);
        const planSnap = await getDoc(planRef);
        if (!planSnap.exists()) {
            toast({ title: "Plano inválido", description: "O plano selecionado não existe. Escolha outro.", variant: 'destructive'});
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
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!planId) return;
    setIsLoading(true);

    const emailCheck = await checkEmailExists(values.email);
    if (emailCheck.exists) {
        form.setError("email", { type: "manual", message: "Este e-mail já está em uso." });
        setIsLoading(false);
        return;
    }

    try {
      localStorage.setItem('signup_name', values.name);
      localStorage.setItem('signup_email', values.email);
      localStorage.setItem('signup_password', values.password);

      const checkoutResult = await createCheckoutSession(planId, interval, values.email);
      if (!checkoutResult.success || !checkoutResult.url) {
        throw new Error(checkoutResult.message || 'Não foi possível iniciar o pagamento.');
      }
      router.push(checkoutResult.url);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha no Processo', description: error.message });
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <Card className="w-full max-w-lg"><CardHeader><CardTitle>Verificando plano...</CardTitle><CardDescription>Aguarde um momento...</CardDescription></CardHeader>
        <CardContent className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Card className="w-full">
            <CardHeader><CardTitle>Finalize seu Cadastro</CardTitle><CardDescription>Crie sua conta e prossiga para o pagamento seguro.</CardDescription></CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <Button type="submit" className="w-full !mt-6" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : 'Ir para o Pagamento'}</Button>
                </form>
                </Form>
            </CardContent>
        </Card>
        <div className="hidden md:block">
            <Card className="w-full sticky top-28">
                <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                            <p className="font-semibold">{selectedPlan?.name}</p>
                            <p className="text-sm text-muted-foreground">Plano ({interval === 'month' ? 'Mensal' : 'Anual'})</p>
                        </div>
                        <p className="font-bold text-lg">{formatCurrency(interval === 'month' ? selectedPlan?.monthlyPrice || 0 : selectedPlan?.yearlyPrice || 0)}</p>
                    </div>
                     <div className="flex items-center text-sm text-muted-foreground gap-2 border-t pt-4">
                        <ShieldCheck className="h-5 w-5 text-green-500"/>
                        <span>Pagamento seguro via <span className='font-bold'>Stripe</span>.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}

export default function SignupPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-secondary p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <SignupForm />
            </Suspense>
        </main>
    );
}
