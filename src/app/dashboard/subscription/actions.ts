'use server';

import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Stripe from 'stripe';
import { headers } from 'next/headers';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada pelo administrador do site.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

export async function createStripePortalSession(): Promise<{ success: boolean; url?: string; message?: string; }> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        // This check is mainly for type safety, the page should protect against unauthenticated access.
        return { success: false, message: 'Usuário não autenticado.' };
    }

    try {
        const stripe = await getStripeInstance();
        const origin = headers().get('origin') || 'http://localhost:3000';

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error('Documento do usuário não encontrado.');
        }

        const stripeCustomerId = userDocSnap.data().stripeCustomerId;

        if (!stripeCustomerId) {
            throw new Error('ID de cliente do Stripe não encontrado para este usuário.');
        }

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
