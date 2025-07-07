
'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import type { SubscriptionDetails } from '@/types';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada pelo administrador do site.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

async function getStripeCustomerId(): Promise<string> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Usuário não autenticado.');

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) throw new Error('Documento do usuário não encontrado.');
    
    const stripeCustomerId = userDocSnap.data().stripeCustomerId;
    if (!stripeCustomerId) throw new Error('ID de cliente do Stripe não encontrado para este usuário.');
    
    return stripeCustomerId;
}

export async function getSubscriptionDetails(): Promise<{ success: boolean; data?: SubscriptionDetails; message?: string }> {
    try {
        const stripe = await getStripeInstance();
        const customerId = await getStripeCustomerId();

        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 1, // Get the most recent subscription
            expand: ['data.plan.product'],
        });

        if (subscriptions.data.length === 0) {
            return { success: false, message: 'Nenhuma assinatura encontrada.' };
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


export async function cancelSubscriptionAction(subscriptionId: string): Promise<{ success: boolean; message?: string }> {
     if (!subscriptionId) return { success: false, message: 'ID da assinatura não fornecido.' };
    
    try {
        const stripe = await getStripeInstance();
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        // Also update our local record
        const firebaseUser = auth.currentUser;
        if(firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            await updateDoc(userDocRef, { subscriptionStatus: 'canceled' });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error canceling subscription:", error);
        return { success: false, message: error.message || 'Falha ao cancelar a assinatura.' };
    }
}


export async function createStripePortalSession(): Promise<{ success: boolean; url?: string; message?: string; }> {
    try {
        const stripe = await getStripeInstance();
        const customerId = await getStripeCustomerId();
        const origin = headers().get('origin') || 'http://localhost:3000';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/dashboard/subscription`,
        });

        return { success: true, url: portalSession.url };

    } catch (error: any) {
        console.error("Error creating Stripe portal session:", error);
        return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
    }
}
