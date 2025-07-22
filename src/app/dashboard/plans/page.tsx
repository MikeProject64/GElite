
'use client';

import { useEffect, useState, Suspense, FC } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan, SubscriptionDetails, SystemUser } from '@/types';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as gtag from '@/lib/utils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, CreditCard, ExternalLink } from 'lucide-react';
import { createStripePortalSession, getSubscriptionDetails, cancelSubscriptionAction, createSubscriptionCheckoutSession, verifySubscriptionAndUpgradeUser } from './actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PlanOptionCard: FC<{ plan: Plan; onSubscribe: (plan: Plan, interval: 'month' | 'year') => void; isRedirecting: boolean; }> = ({ plan, onSubscribe, isRedirecting }) => {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                <div className="mb-6">
                    <p className="text-3xl font-bold">{formatCurrency(plan.monthlyPrice)}<span className="text-lg font-normal text-muted-foreground">/mês</span></p>
                    {plan.yearlyPrice > 0 && <p className="text-xs text-muted-foreground">ou {formatCurrency(plan.yearlyPrice)}/ano</p>}
                </div>
                <ul className="space-y-2 text-sm flex-grow">
                    {plan.planItems?.map((item, index) => (
                        <li key={index} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span>{item.value}</span></li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2 pt-4">
                <Button onClick={() => onSubscribe(plan, 'month')} disabled={isRedirecting} className="w-full">Contratar Mensal</Button>
                {plan.yearlyPrice > 0 && <Button onClick={() => onSubscribe(plan, 'year')} disabled={isRedirecting} variant="outline" className="w-full">Contratar Anual</Button>}
            </CardFooter>
        </Card>
    );
};


function SubscriptionPageContent() {
  const { systemUser, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [otherPlans, setOtherPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);


  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('success') && searchParams.get('session_id') && user) {
        setIsVerifying(true);
        verifySubscriptionAndUpgradeUser(searchParams.get('session_id')!, user.uid).then(result => {
            if (result.success) toast({ title: 'Assinatura Ativada!', description: 'Seu plano foi atualizado com sucesso.' });
            else toast({ variant: 'destructive', title: 'Erro na Ativação', description: result.message });
            router.replace('/dashboard/plans', { scroll: false });
            setIsVerifying(false);
        });
    }
  }, [user, router, toast]);

  useEffect(() => {
    if (!systemUser) return;

    const fetchData = async () => {
        setIsLoading(true);
        if (systemUser.planId) {
            const planSnap = await getDoc(doc(db, 'plans', systemUser.planId));
            if (planSnap.exists()) setCurrentPlan({ id: planSnap.id, ...planSnap.data() } as Plan);
        }
        if (systemUser.stripeCustomerId) {
            const subResult = await getSubscriptionDetails(systemUser.stripeCustomerId);
            if (subResult.success) setSubscription(subResult.data || null);
        }
        setIsLoading(false);
    };

    const q = query(collection(db, 'plans'), where('isPublic', '==', true), orderBy('monthlyPrice', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setOtherPlans(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Plan)).filter(p => p.id !== systemUser.planId));
    });
    
    fetchData();
    return () => unsubscribe();
  }, [systemUser]);

  const handleSubscribe = async (plan: Plan, interval: 'month' | 'year') => {
    if (!user || !user.email) return;
    setIsRedirecting(true);
    const result = await createSubscriptionCheckoutSession(plan.id, interval, user.uid, user.email, systemUser?.stripeCustomerId);
    if (result.success && result.url) router.push(result.url);
    else { toast({ variant: 'destructive', title: 'Erro', description: result.message }); setIsRedirecting(false); }
  };

  const handleManagePayment = async () => {
    if (!systemUser?.stripeCustomerId) return;
    setIsRedirecting(true);
    const result = await createStripePortalSession(systemUser.stripeCustomerId);
    if (result.success && result.url) router.push(result.url);
    else { toast({ variant: 'destructive', title: 'Erro', description: result.message }); setIsRedirecting(false); }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.id || !systemUser) return;
    setIsCanceling(true);
    const result = await cancelSubscriptionAction(systemUser.uid, subscription.id);
    if (result.success) {
        toast({ title: 'Sucesso', description: 'Sua assinatura foi agendada para cancelamento.' });
        if (systemUser.stripeCustomerId) {
            const updatedSub = await getSubscriptionDetails(systemUser.stripeCustomerId);
            if (updatedSub.success) setSubscription(updatedSub.data || null);
        }
    } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    setIsCanceling(false);
    setIsCancelAlertOpen(false);
  };
  
  const getStatusInfo = (): { text: string; variant: "default" | "destructive" | "secondary"; description: string } => {
    if (isLoading) return { text: 'Carregando...', variant: 'secondary', description: 'Buscando informações...' };
    if (!currentPlan) return { text: 'Nenhum Plano', variant: 'destructive', description: 'Escolha um dos planos abaixo para começar.' };
    if (systemUser?.subscriptionStatus === 'trialing' && systemUser.trialEndsAt) return { text: `Em Teste Gratuito`, variant: 'secondary', description: `Seu acesso de teste termina em ${format(systemUser.trialEndsAt.toDate(), 'dd/MM/yyyy', { locale: ptBR })}.` };
    if (!subscription || subscription.status !== 'active') return { text: 'Atribuído Manualmente', variant: 'default', description: 'Este plano foi concedido a você pela administração.' };
    if (subscription.cancelAtPeriodEnd) return { text: 'Cancelamento Agendado', variant: 'destructive', description: `O acesso permanecerá ativo até ${format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR })}.` };
    return { text: 'Ativo via Assinatura', variant: 'default', description: `Sua assinatura está em dia. Próxima cobrança em ${format(new Date(subscription.currentPeriodEnd), 'dd/MM/yyyy', { locale: ptBR })}.` };
  };

  if (authLoading || isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isVerifying) return <Card><CardHeader><CardTitle>Verificando sua Assinatura...</CardTitle></CardHeader></Card>;

  const statusInfo = getStatusInfo();
  const hasActiveSubscription = subscription && subscription.status === 'active';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Meu Plano: {currentPlan?.name || 'Nenhum'}</span>
            <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
          </CardTitle>
          <CardDescription>{statusInfo.description}</CardDescription>
        </CardHeader>
        {currentPlan && (
            <CardContent>
                <h4 className="font-semibold mb-4 text-lg">Recursos Inclusos:</h4>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                    {currentPlan.planItems?.map((item, index) => (
                        <li key={index} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span>{item.value}</span></li>
                    ))}
                </ul>
            </CardContent>
        )}
        <CardFooter className="flex flex-wrap gap-2">
            {hasActiveSubscription && (
                <>
                    <Button onClick={handleManagePayment} disabled={isRedirecting} variant="outline"><ExternalLink className="mr-2 h-4 w-4" />Gerenciar Pagamento</Button>
                    {!subscription.cancelAtPeriodEnd && <Button onClick={() => setIsCancelAlertOpen(true)} disabled={isCanceling} variant="destructive"><XCircle className="mr-2 h-4 w-4" />Cancelar Assinatura</Button>}
                </>
            )}
        </CardFooter>
      </Card>
      {otherPlans.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold tracking-tight mb-4">{hasActiveSubscription ? 'Mudar de Plano' : 'Escolha um Plano'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {otherPlans.map(plan => (
                    <PlanOptionCard key={plan.id} plan={plan} onSubscribe={handleSubscribe} isRedirecting={isRedirecting}/>
                ))}
            </div>
          </div>
      )}
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Cancelar Assinatura</AlertDialogTitle><AlertDialogDescription>Tem certeza? Sua assinatura permanecerá ativa até o final do período de cobrança.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleCancelSubscription}>Sim, cancelar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default function PlansPage() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Gerenciamento de Assinatura</h1>
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <SubscriptionPageContent />
            </Suspense>
        </div>
    );
}
