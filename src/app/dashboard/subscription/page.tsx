'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, CreditCard, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { createStripePortalSession } from './actions';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function NoPlanView() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Escolha seu Plano</CardTitle>
                <CardDescription>Para começar a usar o sistema, você precisa escolher um plano de assinatura.</CardDescription>
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
                                <span className='capitalize'>{feature}</span>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                    <CardFooter className='flex-col gap-2'>
                        <Button asChild className={`w-full`}>
                        <Link href={`/signup?planId=${plan.id}&interval=month`}>Contratar Mensal</Link>
                        </Button>
                        {plan.yearlyPrice > 0 && (
                        <Button asChild variant="outline" className={`w-full`}>
                            <Link href={`/signup?planId=${plan.id}&interval=year`}>Contratar Anual</Link>
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
    const { systemUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        const fetchPlan = async () => {
            if (systemUser?.planId) {
                const planRef = doc(db, 'plans', systemUser.planId);
                const planSnap = await getDoc(planRef);
                if (planSnap.exists()) {
                    setPlan({ id: planSnap.id, ...planSnap.data() } as Plan);
                }
            }
            setIsLoading(false);
        };
        
        fetchPlan();
    }, [systemUser]);

    const handleManageSubscription = async () => {
        setIsRedirecting(true);
        const result = await createStripePortalSession();

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
    
    const getStatusInfo = () => {
        switch (systemUser?.subscriptionStatus) {
            case 'active':
                return { text: 'Ativa', variant: 'default' as const, icon: <CheckCircle className="h-4 w-4" />, description: 'Sua assinatura está em dia. Você tem acesso a todos os recursos do seu plano.' };
            case 'canceled':
                return { text: 'Cancelada', variant: 'secondary' as const, icon: <XCircle className="h-4 w-4" />, description: 'Sua assinatura foi cancelada e não será renovada. O acesso permanecerá até o fim do período pago.' };
            default:
                return { text: 'Indefinido', variant: 'secondary' as const, icon: <CreditCard className="h-4 w-4" />, description: 'Não foi possível determinar o status da sua assinatura.' };
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!plan || !systemUser?.planId) {
        return <NoPlanView />
    }

    const statusInfo = getStatusInfo();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Meu Plano: {plan.name}</span>
                    <Badge variant={statusInfo.variant} className='gap-2'><span className='hidden sm:inline'>{statusInfo.icon}</span>{statusInfo.text}</Badge>
                </CardTitle>
                <CardDescription>{statusInfo.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Recursos Inclusos:</h4>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                        {Object.entries(plan.features).map(([key, value]) => value && (
                            <li key={key} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="capitalize">{key}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
            <CardFooter className="gap-2">
                 {systemUser.subscriptionStatus === 'active' && systemUser.stripeCustomerId && (
                    <Button onClick={handleManageSubscription} disabled={isRedirecting}>
                        {isRedirecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                        Gerenciar Assinatura
                    </Button>
                 )}
            </CardFooter>
        </Card>
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
