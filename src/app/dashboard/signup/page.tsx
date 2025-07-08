
'use client';

import { useState, Suspense, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
import { createCheckoutSession, checkEmailExists, createTrialUser } from '@/app/signup/actions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const featureMap: Record<string, string> = {
  servicos: 'Gestão de Serviços',
  orcamentos: 'Criação de Orçamentos',
  prazos: 'Controle de Prazos',
  atividades: 'Histórico de Atividades',
  clientes: 'Base de Clientes (CRM)',
  colaboradores: 'Equipes e Colaboradores',
  inventario: 'Controle de Inventário',
};

const paidSignupSchema = z.object({
  name: z.string().min(3, { message: 'O nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

const trialSignupSchema = z.object({
  name: z.string().min(3, { message: 'O nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  phone: z.string().refine(val => val.replace(/\D/g, '').length >= 10, { message: 'Telefone inválido.'}),
  companyName: z.string().min(2, { message: 'O nome da empresa é obrigatório.'}),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

// Trial Signup Form Component
function TrialSignupForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

    const form = useForm<z.infer<typeof trialSignupSchema>>({
        resolver: zodResolver(trialSignupSchema),
        defaultValues: { name: '', email: '', phone: '', companyName: '', password: '', confirmPassword: '' },
    });

    const handleEmailBlur = useCallback(async (email: string) => {
        if (!email || !form.formState.dirtyFields.email) return;
        const isEmailValid = await form.trigger("email");
        if (!isEmailValid) return;
        setIsVerifyingEmail(true);
        const { exists } = await checkEmailExists(email);
        if (exists) {
            form.setError("email", { type: "manual", message: "Este e-mail já está em uso." });
        }
        setIsVerifyingEmail(false);
    }, [form]);

    const onSubmit = async (values: z.infer<typeof trialSignupSchema>) => {
        setIsLoading(true);
        const result = await createTrialUser(values);

        if (result.success && result.email) {
            await signInWithEmailAndPassword(auth, result.email, values.password);
            toast({ title: "Bem-vindo(a)!", description: "Sua conta de teste foi criada com sucesso." });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: 'Falha no Cadastro', description: result.message });
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-lg">
            <CardHeader className='text-center'>
                <CardTitle className='font-headline text-3xl'>Inicie seu Teste Gratuito</CardTitle>
                <CardDescription>Acesso completo por 7 dias. Sem cartão de crédito.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>E-mail</FormLabel>
                                <FormControl>
                                <div className="relative">
                                    <Input placeholder="seu@email.com" {...field} onBlur={() => handleEmailBlur(field.value)} />
                                    {isVerifyingEmail && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                                </div>
                                </FormControl>
                            <FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Nome da Empresa</FormLabel><FormControl><Input placeholder="Sua empresa" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <Button type="submit" className="w-full !mt-6" disabled={isLoading || isVerifyingEmail}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Começar a Usar'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// Paid Signup Form Component
function PaidSignupForm({ planId, interval }: { planId: string; interval: 'month' | 'year' }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const verifyPlan = async () => {
        const planRef = doc(db, 'plans', planId);
        const planSnap = await getDoc(planRef);
        if (!planSnap.exists()) {
            toast({ title: "Plano inválido", description: "O plano selecionado não existe.", variant: 'destructive'});
            router.push('/#pricing');
            return;
        }
        setSelectedPlan({ id: planSnap.id, ...planSnap.data() } as Plan);
    }
    verifyPlan();
  }, [planId, router, toast]);

  const form = useForm<z.infer<typeof paidSignupSchema>>({
    resolver: zodResolver(paidSignupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleEmailBlur = useCallback(async (email: string) => {
    if (!email || !form.formState.dirtyFields.email) return;
    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) return;
    setIsVerifyingEmail(true);
    const { exists } = await checkEmailExists(email);
    if (exists) {
      form.setError("email", { type: "manual", message: "Este e-mail já está em uso." });
    }
    setIsVerifyingEmail(false);
  }, [form]);


  const onSubmit = async (values: z.infer<typeof paidSignupSchema>) => {
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

  if (!selectedPlan) {
    return (
      <Card className="w-full max-w-lg"><CardHeader><CardTitle>Verificando plano...</CardTitle></CardHeader>
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
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl>
                            <div className="relative">
                                <Input placeholder="seu@email.com" {...field} onBlur={() => handleEmailBlur(field.value)} />
                                {isVerifyingEmail && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                            </div>
                        </FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <Button type="submit" className="w-full !mt-6" disabled={isLoading || isVerifyingEmail}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Ir para o Pagamento'}
                    </Button>
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
                            <p className="font-semibold">{selectedPlan.name}</p>
                            <p className="text-sm text-muted-foreground">Plano ({interval === 'month' ? 'Mensal' : 'Anual'})</p>
                        </div>
                        <p className="font-bold text-lg">{formatCurrency(interval === 'month' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice)}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Recursos inclusos:</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {Object.entries(selectedPlan.features).map(([key, value]) => value && (
                                <li key={key} className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>{featureMap[key as keyof typeof featureMap] || key}</span>
                                </li>
                            ))}
                        </ul>
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


function SignupPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading } = useAuth();

    const isTrial = searchParams.get('trial') === 'true';
    const planId = searchParams.get('planId');
    const interval = searchParams.get('interval') as 'month' | 'year' | null || 'month';

    // Redirect logged in users to dashboard, unless they are trying to subscribe
    useEffect(() => {
        const planIdParam = searchParams.get('planId');
        if (!loading && user && !planIdParam) {
            router.push('/dashboard');
        }
    }, [user, loading, router, searchParams]);
    
    // Redirect to pricing if no params are present and user is not logged in
    useEffect(() => {
        if (!loading && !user) {
            if (!isTrial && !planId) {
                router.push('/#pricing');
            }
        }
    }, [isTrial, planId, router, user, loading]);

    // Show a loader while auth state is resolving or if user is logged in (before redirect)
    if (loading || (user && !searchParams.get('planId'))) {
        return <div className='flex justify-center items-center h-48'><Loader2 className='h-8 w-8 animate-spin' /></div>;
    }

    // Once auth is resolved and we know there's no user, render the correct form
    if (isTrial) {
        return <TrialSignupForm />;
    }

    if (planId) {
        return <PaidSignupForm planId={planId} interval={interval} />;
    }
    
    // Fallback loader while redirecting to pricing page if needed
    return <div className='flex justify-center items-center h-48'><Loader2 className='h-8 w-8 animate-spin' /></div>;
}


export default function SignupPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-secondary p-4">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <SignupPageContent />
            </Suspense>
        </main>
    );
}

    