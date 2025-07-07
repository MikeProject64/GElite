
'use server';

import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Stripe from 'stripe';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada pelo administrador do site.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

export async function verifyCheckoutAndCreateUser(sessionId: string, name: string, password: string) {
    if (!sessionId || !password || !name) {
        return { success: false, message: 'Dados da sessão, nome ou senha ausentes.' };
    }

    try {
        const stripe = await getStripeInstance();
        
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'customer'],
        });

        if (session.status !== 'complete') {
            throw new Error('Sessão de pagamento não foi completada.');
        }

        const email = session.customer_email || (session.customer as Stripe.Customer)?.email;
        if (!email) {
            throw new Error('E-mail do cliente não encontrado na sessão do Stripe.');
        }

        const subscription = session.subscription as Stripe.Subscription;
        if (!subscription || !subscription.id) {
            throw new Error('Detalhes da assinatura não encontrados na sessão.');
        }

        const customer = session.customer as Stripe.Customer;
        if (!customer || !customer.id) {
            throw new Error('Detalhes do cliente Stripe não encontrados na sessão.');
        }
        
        const planId = subscription.metadata.planId;
        if (!planId) {
            throw new Error('ID do plano não encontrado nos metadados da assinatura.');
        }

        // 1. Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: user.email,
            createdAt: Timestamp.now(),
            role: 'user',
            planId: planId,
            stripeCustomerId: customer.id, // Store the customer ID string, not the object
            subscriptionStatus: 'active',
            subscriptionId: subscription.id,
        });

        return { success: true, email: user.email };

    } catch (error: any) {
        let errorMessage = error.message || 'Ocorreu um erro desconhecido.';
        if(error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este e-mail já foi utilizado para criar uma conta. Faça login para acessar seu painel.';
        }
        console.error("Error creating user after payment:", error);
        return { success: false, message: errorMessage };
    }
}
