
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
import { Loader2, ShieldCheck, CheckCircle } from 'lucide-react';
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
import { Wrench } from 'lucide-react';

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
  name: z.string().min(3, { message: 'O nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string(),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Você deve aceitar os Termos e a Política de Privacidade." }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
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


const TrialFeatures = () => (
    <Card className="w-full sticky top-28">
        <CardHeader>
            <CardTitle>Acesso Completo</CardTitle>
            <CardDescription>Durante 7 dias, você terá acesso a todas as funcionalidades premium:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

// Trial Signup Form Component
function TrialSignupForm() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

    const form = useForm<z.infer<typeof trialSignupSchema>>({
        resolver: zodResolver(trialSignupSchema),
        defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '', terms: false },
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
            <div className="md:hidden mt-8">
               <TrialFeatures />
            </div>
        </div>
    );
}

const CreditCardIcons = () => {
    const icons = [
      // Visa
      <svg key="visa" width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-visa"><title id="pi-visa">Visa</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"/><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"/><path d="M28.8 10.1c-.1-.3-.3-.5-.4-.7-.1-.2-.3-.4-.6-.5-.3-.2-.7-.3-1.1-.3-1.1 0-2 .5-2.5 1.4-.4 1-.1 2.5.8 3.4.6.5 1.4.7 2.1.7.5 0 .9-.1 1.2-.4.1 0 .2-.1.2-.1.1-.1.2-.2.2-.3l.1-.3.1-.4.2-.6.2-.7.1-.4.1-.3zm-9.2.6c.3-1.3 1.5-2.2 2.9-2.2.8 0 1.5.3 2 .8.5.5.8 1.1.9 1.8l-5.8-.1z" fill="#0065a4"/><path d="M23.5 10.3c.3-1.7 1.7-2.7 3.2-2.7.9 0 1.6.3 2.2.8.6.5.9 1.2 1 2-.1.1-.2.1-.2.2l-6.2.1z" fill="#f9a000"/><path d="M14.3 14.8c.3.3.8.4 1.1.4.5 0 .8-.1 1.1-.3.2-.2.3-.4.3-.6 0-.2-.1-.4-.4-.5-.2-.1-.5-.2-.8-.2-.7-.1-1.4-.2-2-.3-.6-.1-1.1-.2-1.5-.4-.4-.2-.7-.5-.9-.9-.2-.3-.3-.7-.3-1.1 0-.7.3-1.4.8-1.9.5-.5 1.2-.8 2.1-.8.6 0 1.2.1 1.7.4.5.2.9.5 1.1.9.2.3.3.7.2 1.1-.2.2-.5.4-.9.4-.3 0-.6-.1-.8-.3-.2-.2-.2-.4-.2-.6s.1-.4.3-.5c.2-.1.5-.2.8-.2.8 0 1.6.1 2.3.3.7.2 1.3.4 1.8.6.5.2.9.5 1.1.8.2.4.3.8.3 1.2 0 .7-.2 1.3-.7 1.8-.5.5-1.2.8-2.1.8-.7 0-1.3-.2-1.8-.5-.5-.3-.8-.7-1-1.1-.2-.3-.4-.5-.6-.6-.2-.2-.5-.2-.8-.1zM11.2 9.4c-.2-.2-.5-.3-.8-.3-.4 0-.7.1-.9.3-.2.2-.3.4-.3.7 0 .3.1.5.3.6.2.1.5.2.8.2.4 0 .7-.1.9-.2.2-.1.3-.3.3-.5.1-.2-.1-.4-.3-.5zM8.8 15.3l-1.6-6.4-1.3 6.4h1.6l.5-2.5h.1l.5 2.5h1.6zM6.6 9h-1.2l-1.3 6.4h1.6l.2-1h1.4l.2 1h1.5L6.6 9z" fill="#0065a4"/></svg>,
      // Mastercard
      <svg key="mc" width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-mastercard"><title id="pi-mastercard">Mastercard</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"/><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"/><circle fill="#EB001B" cx="15" cy="12" r="7"/><circle fill="#F79E1B" cx="23" cy="12" r="7"/><path fill="#FF5F00" d="M22 12c0-2.4-1.2-4.5-3-5.7-1.8 1.3-3 3.4-3 5.7s1.2 4.5 3 5.7c1.8-1.2 3-3.3 3-5.7z"/></svg>,
      // Amex
      <svg key="amex" width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-american_express"><title id="pi-american_express">American Express</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"/><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"/><path d="M15,18 L15,6 L23,6 L23,18 L15,18 Z M16.5,7.5 L21.5,7.5 L21.5,16.5 L16.5,16.5 L16.5,7.5 Z M25,18 L25,6 L33,6 L33,7.5 L26.5,7.5 L26.5,11.25 L32,11.25 L32,12.75 L26.5,12.75 L26.5,16.5 L33,16.5 L33,18 L25,18 Z M5,18 L5,6 L13,6 L13,7.5 L6.5,7.5 L6.5,11.25 L12,11.25 L12,12.75 L6.5,12.75 L6.5,16.5 L13,16.5 L13,18 L5,18 Z" fill="#006fcf"/></svg>,
       // Elo
      <svg key="elo" width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pi-elo"><title id="pi-elo">Elo</title><path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"/><path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32z"/><circle fill="#2C2C2C" cx="12" cy="12" r="7"/><circle fill="#2C2C2C" cx="26" cy="12" r="7"/><path fill="#F4A532" d="m20 12c0-1.1046-.8954-2-2-2s-2 .8954-2 2 .8954 2 2 2 2-.8954 2-2zm-14 0c0-3.3137 2.6863-6 6-6s6 2.6863 6 6-2.6863 6-6 6-6-2.6863-6-6zm28 0c0-3.3137-2.6863-6-6-6s-6 2.6863-6 6 2.6863 6 6 6 6-2.6863 6-6z"/></svg>
    ];
    return <div className="flex gap-1 items-center">{icons}</div>
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
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', terms: false },
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
  
  const OrderSummary = ({ isMobile = false } : { isMobile?: boolean }) => (
    <Card className={`w-full ${isMobile ? 'mt-8' : 'sticky top-28'}`}>
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
                <div className="space-y-2 border-t pt-4">
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-500"/>
                        <span>Pagamento seguro via <span className='font-bold'>Stripe</span>.</span>
                    </div>
                     <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <CreditCardIcons />
                    </div>
                </div>
        </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-4xl w-full">
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
         <div className="md:hidden">
            <OrderSummary isMobile />
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

    const SignupForm = isTrial ? TrialSignupForm : (planId ? () => <PaidSignupForm planId={planId} interval={interval} /> : () => <Loader2 className='h-8 w-8 animate-spin' />);

    return (
        <div className="flex flex-col items-center justify-center p-4 w-full">
            <div className="flex items-center gap-3 mb-8">
                {siteConfig.logoURL ? (
                    <Image src={siteConfig.logoURL} alt="Logo" width={32} height={32} className="h-8 w-8 object-contain" />
                ) : (
                    <Icon className="h-8 w-8 text-primary" />
                )}
                <h1 className="text-3xl font-bold font-headline">{siteConfig.siteName}</h1>
            </div>
            <SignupForm />
        </div>
    );
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
