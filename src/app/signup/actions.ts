
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

export async function createCheckoutSession(planId: string, interval: 'month' | 'year', userId: string) {
    try {
        const stripe = await getStripeInstance();
        const origin = headers().get('origin') || 'http://localhost:3000';

        // 1. Get Plan and User details from Firestore
        const planRef = doc(db, 'plans', planId);
        const userRef = doc(db, 'users', userId);
        const [planSnap, userSnap] = await Promise.all([getDoc(planRef), getDoc(userRef)]);

        if (!planSnap.exists()) throw new Error('Plano não encontrado.');
        if (!userSnap.exists()) throw new Error('Usuário não encontrado.');

        const plan = { id: planSnap.id, ...planSnap.data() } as Plan;
        const user = { uid: userSnap.id, ...userSnap.data() } as SystemUser;

        // 2. Get or Create Stripe Customer
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.email, // Or a display name if you have one
                metadata: { firebaseUID: user.uid },
            });
            stripeCustomerId = customer.id;
            await updateDoc(userRef, { stripeCustomerId });
        }

        // 3. Get or Create Stripe Price ID
        const isYearly = interval === 'year';
        let priceId = isYearly ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
        
        if (!priceId) {
            // Find or create a Stripe Product for this plan
            let product;
            const existingProducts = await stripe.products.list({ query: `metadata['planId']:'${plan.id}'` });
            if (existingProducts.data.length > 0) {
                product = existingProducts.data[0];
            } else {
                product = await stripe.products.create({
                    name: plan.name,
                    description: plan.description,
                    metadata: { planId: plan.id }
                });
            }
            
            // Create the Stripe Price
            const price = await stripe.prices.create({
                product: product.id,
                unit_amount: (isYearly ? plan.yearlyPrice : plan.monthlyPrice) * 100, // in cents
                currency: 'brl',
                recurring: { interval: isYearly ? 'year' : 'month' },
            });
            priceId = price.id;
            
            // Save the new price ID back to Firestore
            const planUpdateData = isYearly ? { stripeYearlyPriceId: priceId } : { stripeMonthlyPriceId: priceId };
            await updateDoc(planRef, planUpdateData);
        }

        // 4. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: stripeCustomerId,
            client_reference_id: user.uid,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/#pricing`,
            subscription_data: {
                metadata: { firebaseUID: user.uid, planId: plan.id }
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
