
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan, SubscriptionDetails } from '@/types';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createStripePortalSession, getSubscriptionDetails, cancelSubscriptionAction } from './actions';
import { createCheckoutSession } from '../signup/actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

function NoPlanView() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'plans'), where('isPublic', '==', true), orderBy('monthlyPrice', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
            setPlans(fetchedPlans);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching public plans: ", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubscribe = async (planId: string, interval: 'month' | 'year') => {
        if (!user || !user.email) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não encontrado. Por favor, faça login novamente.' });
            return;
        }
        setIsRedirecting(planId + interval);
        const result = await createCheckoutSession(planId, interval, user.email);
        
        if (result.success && result.url) {
            router.push(result.url);
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.message || 'Falha ao iniciar o processo de assinatura.' });
            setIsRedirecting(null);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Escolha seu Plano</CardTitle>
                <CardDescription>Escolha o plano ideal para suas necessidades e desbloqueie todo o potencial do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {plans.map((plan) => (
                    <Card key={plan.id} className={`flex flex-col h-full`}>
                    <CardHeader className="text-center">
                        <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                        <CardDescription className="font-body">{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col">
                        <div className="text-center mb-6">
                        <span className="text-4xl font-bold font-headline">{formatCurrency(plan.monthlyPrice)}</span>
                        <span className="text-muted-foreground font-body">/mês</span>
                        {plan.yearlyPrice > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">ou {formatCurrency(plan.yearlyPrice)}/ano</p>
                            )}
                        </div>
                        <ul className="space-y-4 font-body flex-grow">
                        {Object.entries(plan.features).map(([feature, enabled]) => (
                            enabled &&
                            <li key={feature} className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className='capitalize'>{featureMap[feature as keyof typeof featureMap] || feature}</span>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                    <CardFooter className='flex-col gap-2'>
                        <Button
                          onClick={() => handleSubscribe(plan.id, 'month')}
                          disabled={!!isRedirecting}
                          className={`w-full`}
                        >
                            {isRedirecting === `${plan.id}month` ? <Loader2 className="animate-spin" /> : 'Contratar Mensal'}
                        </Button>
                        {plan.yearlyPrice > 0 && (
                        <Button
                           onClick={() => handleSubscribe(plan.id, 'year')}
                           disabled={!!isRedirecting}
                           variant="outline"
                           className={`w-full`}
                        >
                           {isRedirecting === `${plan.id}year` ? <Loader2 className="animate-spin" /> : 'Contratar Anual'}
                        </Button>
                        )}
                    </CardFooter>
                    </Card>
                ))}
            </CardContent>
        </Card>
    )
}

function SubscriptionPageContent() {
    const { systemUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

    useEffect(() => {
        if (authLoading || !systemUser) return;
        
        const fetchInitialData = async () => {
            setIsLoading(true);
            if (systemUser.planId) {
                const planRef = doc(db, 'plans', systemUser.planId);
                const subDetailsResult = await getSubscriptionDetails(systemUser.stripeCustomerId);

                const planSnap = await getDoc(planRef);
                if (planSnap.exists()) {
                    setPlan({ id: planSnap.id, ...planSnap.data() } as Plan);
                }

                if (subDetailsResult.success) {
                    setSubscription(subDetailsResult.data || null);
                } else {
                    toast({ variant: 'destructive', title: 'Erro', description: subDetailsResult.message });
                }
            }
            setIsLoading(false);
        };
        
        fetchInitialData();
    }, [systemUser, authLoading, toast]);

    const handleManagePayment = async () => {
        if (!systemUser) return;
        setIsRedirecting(true);
        const result = await createStripePortalSession(systemUser.stripeCustomerId);

        if (result.success && result.url) {
            router.push(result.url);
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: result.message || 'Não foi possível acessar o portal de gerenciamento.',
            });
            setIsRedirecting(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscription?.id || !systemUser) return;

        setIsCanceling(true);
        const result = await cancelSubscriptionAction(systemUser.uid, subscription.id);
        
        if (result.success) {
            toast({ title: 'Sucesso', description: 'Sua assinatura foi agendada para cancelamento.' });
            const updatedSub = await getSubscriptionDetails(systemUser.stripeCustomerId);
            if (updatedSub.success) {
                setSubscription(updatedSub.data || null);
            }
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.message });
        }
        setIsCanceling(false);
        setIsCancelAlertOpen(false);
    };
    
    const getStatusInfo = () => {
        if (isLoading) return { text: 'Carregando...', variant: 'secondary' as const, icon: <Loader2 className="h-4 w-4 animate-spin" />, description: 'Buscando informações da sua assinatura...' };
        
        if (systemUser?.subscriptionStatus === 'trialing' && systemUser.trialEndsAt) {
            return {
                text: 'Em Teste Gratuito',
                variant: 'secondary' as const,
                icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
                description: `Seu período de teste termina em ${format(systemUser.trialEndsAt.toDate(), 'dd/MM/yyyy', { locale: ptBR })}.`
            };
        }
        
        if (!subscription) return { text: 'Inativa', variant: 'destructive' as const, icon: <XCircle className="h-4 w-4" />, description: 'Não encontramos uma assinatura ativa no Stripe. Se você acabou de pagar, aguarde alguns minutos.' };

        if (subscription.cancelAtPeriodEnd) {
            return {
                text: 'Cancelamento Agendado',
                variant: 'secondary' as const,
                icon: <XCircle className="h-4 w-4" />,
                description: `Sua assinatura permanecerá ativa até ${format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR })}.`
            };
        }

        switch (subscription.status) {
            case 'active':
                return { text: 'Ativa', variant: 'default' as const, icon: <CheckCircle className="h-4 w-4" />, description: 'Sua assinatura está em dia. Você tem acesso a todos os recursos do seu plano.' };
             case 'past_due':
                return { text: 'Pagamento Pendente', variant: 'destructive' as const, icon: <CreditCard className="h-4 w-4" />, description: 'Houve um problema com seu pagamento. Por favor, atualize seus dados.' };
            default:
                return { text: 'Inativa', variant: 'destructive' as const, icon: <XCircle className="h-4 w-4" />, description: 'Sua assinatura não está ativa.' };
        }
    };

    if (authLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!systemUser?.planId && systemUser?.subscriptionStatus !== 'trialing') {
        return <NoPlanView />
    }

    const statusInfo = getStatusInfo();
    const isTrialing = systemUser?.subscriptionStatus === 'trialing';

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Meu Plano: {isTrialing ? 'Teste Gratuito' : (plan?.name || 'N/A')}</span>
                        <Badge variant={statusInfo.variant} className='gap-2'><span className='hidden sm:inline'>{statusInfo.icon}</span>{statusInfo.text}</Badge>
                    </CardTitle>
                    <CardDescription>{statusInfo.description}</CardDescription>
                </CardHeader>
                {!isTrialing && (
                <CardContent className="space-y-6">
                    {subscription && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className='p-3 bg-muted/50 rounded-lg'>
                                <p className="text-muted-foreground">Valor</p>
                                <p className="font-semibold">{formatCurrency(subscription.price / 100)} / {subscription.interval === 'month' ? 'mês' : 'ano'}</p>
                            </div>
                            <div className='p-3 bg-muted/50 rounded-lg'>
                                <p className="text-muted-foreground">Próxima Cobrança</p>
                                <p className="font-semibold">{format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR })}</p>
                            </div>
                        </div>
                    )}
                    {plan && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-semibold mb-2">Recursos Inclusos:</h4>
                            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                                {Object.entries(plan.features).map(([key, value]) => value && (
                                    <li key={key} className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span className="capitalize">{featureMap[key as keyof typeof featureMap] || key}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
                )}
                <CardFooter className="flex flex-wrap gap-2">
                     {!isTrialing && systemUser?.stripeCustomerId && (
                        <Button onClick={handleManagePayment} disabled={isRedirecting} variant="outline">
                            {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                            Gerenciar Pagamento
                        </Button>
                     )}
                     {!isTrialing && subscription?.status === 'active' && !subscription.cancelAtPeriodEnd && (
                        <Button onClick={() => setIsCancelAlertOpen(true)} disabled={isCanceling} variant="destructive">
                            {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Cancelar Assinatura
                        </Button>
                     )}
                </CardFooter>
            </Card>

            {isTrialing && (
                <div className="mt-6">
                    <NoPlanView />
                </div>
            )}

            <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja cancelar? Sua assinatura permanecerá ativa até o final do período de cobrança atual. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive hover:bg-destructive/90">
                            Sim, cancelar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function SubscriptionPage() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Gerenciamento de Assinatura</h1>
            <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <SubscriptionPageContent />
            </Suspense>
        </div>
    );
}
