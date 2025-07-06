
'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import type { Plan, SystemUser } from '@/types';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

export async function activateSubscription(sessionId: string) {
    try {
        const stripe = await getStripeInstance();
        
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.status !== 'complete') {
            throw new Error('Sessão de pagamento não foi completada.');
        }

        const userId = session.client_reference_id;
        if (!userId) {
            throw new Error('ID do usuário não encontrado na sessão do Stripe.');
        }
        
        const subscriptionId = session.subscription;
        if (typeof subscriptionId !== 'string') {
             throw new Error('ID da assinatura não encontrado na sessão do Stripe.');
        }

        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, {
            subscriptionStatus: 'active',
            subscriptionId: subscriptionId,
        });

        return { success: true };

    } catch (error: any) {
        console.error("Error activating subscription:", error);
        return { success: false, message: error.message || 'Ocorreu um erro desconhecido.' };
    }
}
