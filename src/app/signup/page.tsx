
'use client';

import { useState, Suspense, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, CheckCircle, CreditCard, Wrench, ChevronDown } from 'lucide-react';
import { createCheckoutSession, checkEmailExists, createTrialUser } from './actions';
import { doc, getDoc } from 'firebase/firestore';
import type { Plan, UserSettings } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import * as gtag from '@/lib/utils';
import * as fbq from '@/lib/meta-pixel';
import { availableIcons } from '@/components/icon-map';
import Image from 'next/image';
import { cn } from '@/lib/utils';


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const featureMap: Record<string, string> = {
  servicos: 'Gestão de Serviços',
  orcamentos: 'Criação de Orçamentos',
  prazos: 'Controle de Prazos',
  atividades: 'Histórico de Atividades',
  clientes: 'Base de Clientes (CRM)',
  colaboradores: 'Equipes e Colaboradores',
  inventario: 'Controle de Inventário',
  contratos: 'Contratos e Recorrência',
};

const paidSignupSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Você deve aceitar os Termos e a Política de Privacidade." }),
  }),
});

const trialSignupSchema = z.object({
  name: z.string().min(3, { message: 'O nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  phone: z.string().refine(val => val.replace(/\D/g, '').length >= 10, { message: 'Telefone inválido.'}),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Você deve aceitar os Termos e a Política de Privacidade." }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

const PartiallyRevealedCard = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <Card className="md:hidden mb-6">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent
                className={cn(
                    "relative overflow-hidden transition-[max-height] duration-500 ease-in-out",
                    isExpanded ? "max-h-[1000px]" : "max-h-[150px]"
                )}
            >
                {children}
                {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent flex items-end justify-center pt-12">
                         <Button
                            variant="link"
                            onClick={() => setIsExpanded(true)}
                            className="text-muted-foreground"
                        >
                            Exibir mais
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


const TrialFeatures = ({ isMobile = false }: { isMobile?: boolean }) => {
    if (isMobile) {
        return (
            <PartiallyRevealedCard
                title="Acesso Completo"
                description="Durante 7 dias, você terá acesso a todas as funcionalidades premium:"
            >
                <ul className="space-y-2 text-sm text-muted-foreground pt-4">
                    {Object.values(featureMap).map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </PartiallyRevealedCard>
        );
    }
    return (
        <Card className="sticky top-28 h-fit">
            <CardHeader>
                <CardTitle>Acesso Completo</CardTitle>
                <CardDescription>Durante 7 dias, você terá acesso a todas as funcionalidades premium:</CardDescription>
            </CardHeader>
            <CardContent>
                 <ul className="space-y-2 text-sm text-muted-foreground">
                    {Object.values(featureMap).map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};


// Trial Signup Form Component
function TrialSignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

    const form = useForm<z.infer<typeof trialSignupSchema>>({
        resolver: zodResolver(trialSignupSchema),
        defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '', terms: false },
    });

    useEffect(() => {
        const emailFromParams = searchParams.get('email');
        if (emailFromParams) {
            form.setValue('email', emailFromParams);
        }
    }, [searchParams, form]);

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
            gtag.event({ action: 'generate_lead', params: { currency: "BRL", value: 1 }});
            fbq.event('StartTrial', { value: 1.00, currency: 'BRL' });
            await signInWithEmailAndPassword(auth, result.email, values.password);
            toast({ title: "Bem-vindo(a)!", description: "Sua conta de teste foi criada com sucesso." });
            router.push('/dashboard');
        } else {
            toast({ variant: 'destructive', title: 'Falha no Cadastro', description: result.message });
            setIsLoading(false);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
            <div className="md:hidden">
               <TrialFeatures isMobile />
            </div>
            <Card className="w-full">
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
                            <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirmar Senha</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField control={form.control} name="terms" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal text-muted-foreground">
                                    Eu li e aceito os{' '}
                                    <Link href="/termos-de-servico" target="_blank" className="underline hover:text-primary">Termos de Serviço</Link>{' '}
                                    e a{' '}
                                    <Link href="/politica-de-privacidade" target="_blank" className="underline hover:text-primary">Política de Privacidade</Link>.
                                    </FormLabel>
                                    <FormMessage />
                                </div>
                                </FormItem>
                            )}/>
                            <Button type="submit" className="w-full !mt-6" disabled={isLoading || isVerifyingEmail}>
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Começar a Usar'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <div className="hidden md:block">
               <TrialFeatures />
            </div>
        </div>
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
    defaultValues: { email: '', terms: false },
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
        if (selectedPlan) {
            const price = interval === 'year' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
            gtag.event({
                action: 'begin_checkout',
                params: {
                    currency: 'BRL',
                    value: price,
                    items: [{
                        item_id: selectedPlan.id,
                        item_name: `${selectedPlan.name} - ${interval}`,
                        price: price,
                        quantity: 1,
                    }]
                }
            });
        }

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
  
  const OrderSummary = ({ isMobile = false }: { isMobile?: boolean }) => {
    const content = (
        <>
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
            <div className="space-y-2 border-t pt-4">
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-500"/>
                    <span>Pagamento seguro via <span className='font-bold'>Stripe</span>.</span>
                </div>
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Aceitamos os principais cartões de crédito.</span>
                </div>
            </div>
        </>
    );

    if (isMobile) {
        return (
            <PartiallyRevealedCard
                title="Resumo do Pedido"
                description="Confira os detalhes do plano selecionado."
            >
                <div className="space-y-4 pt-4">{content}</div>
            </PartiallyRevealedCard>
        );
    }

    return (
        <Card className="sticky top-28 h-fit">
            <CardHeader><CardTitle>Resumo do Pedido</CardTitle></CardHeader>
            <CardContent className="space-y-4">{content}</CardContent>
        </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
         <div className="md:hidden">
            <OrderSummary isMobile />
        </div>
        <Card className="w-full">
            <CardHeader><CardTitle>Finalize seu Cadastro</CardTitle><CardDescription>Insira seu e-mail para prosseguir com o pagamento seguro.</CardDescription></CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl>
                            <div className="relative">
                                <Input placeholder="seu@email.com" {...field} onBlur={() => handleEmailBlur(field.value)} />
                                {isVerifyingEmail && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                            </div>
                        </FormControl><FormMessage /></FormItem>)}/>
                    
                    <FormField control={form.control} name="terms" render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal text-muted-foreground">
                            Eu li e aceito os{' '}
                            <Link href="/termos-de-servico" target="_blank" className="underline hover:text-primary">Termos de Serviço</Link>{' '}
                            e a{' '}<Link href="/politica-de-privacidade" target="_blank" className="underline hover:text-primary">Política de Privacidade</Link>.
                            </FormLabel>
                            <FormMessage />
                        </div>
                        </FormItem>
                    )}/>

                    <Button type="submit" className="w-full !mt-6" disabled={isLoading || isVerifyingEmail}>
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Ir para o Pagamento'}
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
        <div className="hidden md:block">
            <OrderSummary />
        </div>
    </div>
  );
}


function SignupPageContent({ siteConfig }: { siteConfig: Partial<UserSettings> }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, loading } = useAuth();

    const isTrial = searchParams.get('trial') === 'true';
    const planId = searchParams.get('planId');
    const interval = searchParams.get('interval') as 'month' | 'year' | null || 'month';

    const Icon = availableIcons[siteConfig.iconName as keyof typeof availableIcons] || Wrench;

    useEffect(() => {
        const planIdParam = searchParams.get('planId');
        if (!loading && user && !planIdParam) {
            router.push('/dashboard');
        }
    }, [user, loading, router, searchParams]);
    
    useEffect(() => {
        if (!loading && !user) {
            if (!isTrial && !planId) {
                router.push('/#pricing');
            }
        }
    }, [isTrial, planId, router, user, loading]);

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


// Server Component to fetch global settings
export default function SignupPage() {
    const [siteConfig, setSiteConfig] = useState<Partial<UserSettings>>({ siteName: 'Gestor Elite', iconName: 'Wrench' });
    const [loadingConfig, setLoadingConfig] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            const configRef = doc(db, 'siteConfig', 'main');
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                setSiteConfig(configSnap.data());
            }
            setLoadingConfig(false);
        }
        fetchConfig();
    }, []);

    if (loadingConfig) {
        return <main className="flex items-center justify-center min-h-screen bg-secondary"><Loader2 className="h-8 w-8 animate-spin" /></main>;
    }
    
    return (
        <main className="flex items-center justify-center min-h-screen bg-secondary">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <SignupPageContent siteConfig={siteConfig} />
            </Suspense>
        </main>
    );
}
