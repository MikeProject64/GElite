
'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import type { Plan, SubscriptionDetails } from '@/types';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada pelo administrador do site.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

export async function getSubscriptionDetails(stripeCustomerId: string | undefined): Promise<{ success: boolean; data?: SubscriptionDetails; message?: string }> {
    if (!stripeCustomerId) {
        return { success: true, data: undefined, message: 'ID do cliente Stripe não associado a este usuário.' };
    }
    try {
        const stripe = await getStripeInstance();

        const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'all',
            limit: 1, // Get the most recent subscription
            expand: ['data.plan.product'],
        });

        if (subscriptions.data.length === 0) {
            return { success: true, data: undefined, message: 'Nenhuma assinatura encontrada.' };
        }

        const sub = subscriptions.data[0];
        const plan = sub.plan;
        
        const details: SubscriptionDetails = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end * 1000, // Convert to JS timestamp
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            price: plan.amount || 0,
            interval: plan.interval,
            productName: (plan.product as Stripe.Product)?.name || 'Plano Desconhecido',
        };

        return { success: true, data: details };

    } catch (error: any) {
        console.error("Error fetching subscription details:", error);
        return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
    }
}


export async function cancelSubscriptionAction(uid: string, subscriptionId: string): Promise<{ success: boolean; message?: string }> {
     if (!subscriptionId) return { success: false, message: 'ID da assinatura não fornecido.' };
     if (!uid) return { success: false, message: 'Usuário não autenticado.' };
    
    try {
        const stripe = await getStripeInstance();
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, { subscriptionStatus: 'canceled' });

        return { success: true };
    } catch (error: any) {
        console.error("Error canceling subscription:", error);
        return { success: false, message: error.message || 'Falha ao cancelar a assinatura.' };
    }
}


export async function createStripePortalSession(stripeCustomerId: string | undefined): Promise<{ success: boolean; url?: string; message?: string; }> {
    if (!stripeCustomerId) {
        return { success: false, message: 'ID de cliente do Stripe não encontrado para este usuário.' };
    }
    try {
        const stripe = await getStripeInstance();
        const origin = headers().get('origin') || 'http://localhost:3000';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${origin}/dashboard/subscription`,
        });

        return { success: true, url: portalSession.url };

    } catch (error: any) {
        console.error("Error creating Stripe portal session:", error);
        return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
    }
}


export async function createSubscriptionCheckoutSession(planId: string, interval: 'month' | 'year', uid: string, email: string, stripeCustomerId: string | undefined) {
    if (!planId || !uid || !email) {
        return { success: false, message: 'Informações do plano ou do usuário ausentes.' };
    }

    try {
        const stripe = await getStripeInstance();
        const origin = headers().get('origin') || 'http://localhost:3000';

        const planRef = doc(db, 'plans', planId);
        const planSnap = await getDoc(planRef);
        if (!planSnap.exists()) {
            throw new Error('Plano selecionado não foi encontrado.');
        }
        const plan = planSnap.data() as Plan;
        const priceId = interval === 'year' ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;

        if (!priceId) {
            throw new Error('ID de preço para o intervalo selecionado não encontrado.');
        }

        const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard/subscription`,
            client_reference_id: uid, // Associate checkout with Firebase UID
            subscription_data: {
                metadata: { planId: planId, interval: interval, uid: uid }
            }
        };

        if (stripeCustomerId) {
            checkoutSessionParams.customer = stripeCustomerId;
        } else {
            checkoutSessionParams.customer_email = email;
        }

        const session = await stripe.checkout.sessions.create(checkoutSessionParams);
        
        return { success: true, url: session.url };
        
    } catch (error: any) {
        console.error("Error creating subscription checkout session:", error);
        return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
    }
}


export async function verifySubscriptionAndUpgradeUser(sessionId: string, uid: string) {
    if (!sessionId || !uid) {
        return { success: false, message: 'ID da sessão ou do usuário ausente.' };
    }

    try {
        const stripe = await getStripeInstance();
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'customer'],
        });
        
        if (session.client_reference_id !== uid || session.status !== 'complete') {
             throw new Error('Sessão de checkout inválida ou não concluída.');
        }

        const subscription = session.subscription as Stripe.Subscription;
        const customerId = (session.customer as Stripe.Customer)?.id;
        const planId = subscription.metadata.planId;

        if (!subscription || !customerId || !planId) {
            throw new Error('Dados da assinatura incompletos na sessão do Stripe.');
        }

        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
            planId: planId,
            stripeCustomerId: customerId,
            subscriptionId: subscription.id,
            subscriptionStatus: 'active',
            trialStartedAt: null,
            trialEndsAt: null,
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error verifying subscription and upgrading user:", error);
        return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
    }
}
