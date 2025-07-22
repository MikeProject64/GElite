'use server';

import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import type { Plan } from '@/types';
import { addDays } from 'date-fns';
import { randomBytes } from 'crypto';


async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada pelo administrador do site.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

async function getTrialPlanId(): Promise<string | null> {
    const q = query(collection(db, 'plans'), where('isTrial', '==', true), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        // Fallback or error if no trial plan is set
        console.warn("Nenhum plano de teste gratuito foi definido pelo administrador.");
        // Could fetch the cheapest plan as a fallback
        const cheapestPlanQuery = query(collection(db, 'plans'), where('isPublic', '==', true), orderBy('monthlyPrice', 'asc'), limit(1));
        const cheapestPlanSnapshot = await getDocs(cheapestPlanQuery);
        if(!cheapestPlanSnapshot.empty) {
            return cheapestPlanSnapshot.docs[0].id;
        }
        return null;
    }
    return snapshot.docs[0].id;
}

export async function checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    if (!email) {
        return { exists: false, error: 'E-mail não fornecido.' };
    }
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        return { exists: !querySnapshot.empty };
    } catch (error: any) {
        console.error("Error checking email existence: ", error);
        return { exists: false, error: "Não foi possível verificar o e-mail no momento. A verificação final ocorrerá ao criar a conta." };
    }
}


export async function createCheckoutSession(planId: string, interval: 'month' | 'year', email: string) {
    try {
        const stripe = await getStripeInstance();
        const origin = headers().get('origin') || 'http://localhost:3000';

        const planRef = doc(db, 'plans', planId);
        const planSnap = await getDoc(planRef);

        if (!planSnap.exists()) {
            throw new Error('Plano selecionado não foi encontrado no banco de dados.');
        }
        const plan = { id: planSnap.id, ...planSnap.data() } as Plan;

        const isYearly = interval === 'year';
        const priceId = isYearly ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;

        if (!priceId) {
            throw new Error('Este plano não está configurado para pagamentos. Por favor, contate o administrador.');
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: email,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/signup/complete-registration?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/signup?planId=${planId}&interval=${interval}`,
            subscription_data: {
                metadata: { planId: plan.id, interval: interval }
            }
        });

        if (!session.url) {
            return { success: false, message: "Não foi possível criar a sessão de checkout do Stripe." };
        }

        return { success: true, url: session.url };

    } catch (error: any) {
        console.error("Error creating checkout session:", error);
        return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
    }
}


export async function createTrialUser(details: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
    if (!details.email || !details.password || !details.name) {
        return { success: false, message: 'Dados de cadastro ausentes.' };
    }

    try {
        const emailCheck = await checkEmailExists(details.email);
        if (emailCheck.exists) {
            throw new Error('Este e-mail já foi utilizado para criar uma conta.');
        }

        const trialPlanId = await getTrialPlanId();
        if (!trialPlanId) {
            throw new Error('Não há um plano de teste configurado no sistema. Por favor, contate o suporte.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, details.email, details.password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: details.name,
            email: user.email,
            phone: details.phone,
            createdAt: Timestamp.now(),
            role: 'user',
            subscriptionStatus: 'trialing',
            trialStartedAt: Timestamp.now(),
            trialEndsAt: Timestamp.fromDate(addDays(new Date(), 7)),
            planId: trialPlanId,
        });
        
        return { success: true, email: user.email };

    } catch (error: any) {
        let errorMessage = error.message || 'Ocorreu um erro desconhecido.';
        if(error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este e-mail já foi utilizado para criar uma conta. Faça login para acessar seu painel.';
        }
        console.error("Error creating trial user:", error);
        return { success: false, message: errorMessage };
    }
}


export async function createAndLoginQuickTrialUser(email: string) {
    if (!email) {
        return { success: false, message: 'E-mail é obrigatório.' };
    }

    try {
        const emailCheck = await checkEmailExists(email);
        if (emailCheck.exists) {
            return { success: false, message: 'Este e-mail já está em uso. Tente fazer login.' };
        }

        // Generate a secure temporary password
        const tempPassword = randomBytes(16).toString('hex');
        const name = email.split('@')[0];

        const trialPlanId = await getTrialPlanId();
         if (!trialPlanId) {
            throw new Error('Não há um plano de teste configurado no sistema. Por favor, contate o suporte.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
        const user = userCredential.user;

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: user.email,
            phone: '', // Phone not collected in this flow
            createdAt: Timestamp.now(),
            role: 'user',
            subscriptionStatus: 'trialing',
            trialStartedAt: Timestamp.now(),
            trialEndsAt: Timestamp.fromDate(addDays(new Date(), 7)),
            planId: trialPlanId,
        });

        // Return the temporary password for client-side login
        return { success: true, tempPassword };

    } catch (error: any) {
        console.error("Error in quick trial creation:", error);
        return { success: false, message: error.message || 'Ocorreu um erro ao criar a conta.' };
    }
}