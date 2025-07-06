
'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import type { Plan } from '@/types';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada pelo administrador do site.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

export async function createCheckoutSession(planId: string, interval: 'month' | 'year', email: string) {
    try {
        const stripe = await getStripeInstance();
        const origin = headers().get('origin') || 'http://localhost:3000';

        // 1. Get Plan details from Firestore
        const planRef = doc(db, 'plans', planId);
        const planSnap = await getDoc(planRef);

        if (!planSnap.exists()) throw new Error('Plano selecionado não foi encontrado no banco de dados.');
        const plan = { id: planSnap.id, ...planSnap.data() } as Plan;

        // 2. Get or Create Stripe Product & Price IDs
        const isYearly = interval === 'year';
        let priceId = isYearly ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
        
        if (!priceId) {
            let product: Stripe.Product | null = null;

            // Find or create the Stripe Product
            if (plan.stripeProductId) {
                try {
                    product = await stripe.products.retrieve(plan.stripeProductId);
                    if (!product.active) product = null; // Treat inactive products as if they don't exist
                } catch (error) {
                    console.warn(`Could not retrieve Stripe product ${plan.stripeProductId}, will create a new one.`, error);
                    product = null;
                }
            }
            
            if (!product) {
                product = await stripe.products.create({
                    name: plan.name,
                    description: plan.description || undefined,
                    metadata: { planId: plan.id }
                });
                // Save the new product ID back to our plan document in Firestore
                await updateDoc(planRef, { stripeProductId: product.id });
            }
            
            // Create the Stripe Price
            const price = await stripe.prices.create({
                product: product.id,
                unit_amount: (isYearly ? plan.yearlyPrice : plan.monthlyPrice) * 100, // in cents
                currency: 'brl',
                recurring: { interval: isYearly ? 'year' : 'month' },
            });
            priceId = price.id;
            
            // Save the new price ID back to our plan document
            const planUpdateData = isYearly ? { stripeYearlyPriceId: priceId } : { stripeMonthlyPriceId: priceId };
            await updateDoc(planRef, planUpdateData);
        }

        // 3. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: email, // Pre-fill customer email
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
