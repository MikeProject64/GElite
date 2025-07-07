
'use server';

import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      throw new Error('Configurações do site não encontradas no banco de dados.');
    }

    const settingsData = settingsSnap.data();
    const stripeSecretKey = settingsData.stripeSecretKey;

    if (!stripeSecretKey || typeof stripeSecretKey !== 'string') {
      throw new Error('Chave secreta do Stripe não configurada ou inválida.');
    }
    
    return new Stripe(stripeSecretKey);
}

interface SyncPlanInput {
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  stripeProductId?: string;
}

interface SyncPlanOutput {
    success: boolean;
    message?: string;
    stripeProductId?: string;
    stripeMonthlyPriceId?: string;
    stripeYearlyPriceId?: string;
}

/**
 * Syncs a plan with Stripe. Creates or updates a Stripe Product,
 * and creates new Stripe Prices for the given monthly and yearly amounts.
 * This function is designed to be called when an admin creates or updates a plan.
 */
export async function syncPlanWithStripe(planData: SyncPlanInput): Promise<SyncPlanOutput> {
    try {
        const stripe = await getStripeInstance();
        
        // Fetch logoURL from siteConfig
        const settingsRef = doc(db, 'siteConfig', 'main');
        const settingsSnap = await getDoc(settingsRef);
        const logoURL = settingsSnap.exists() ? settingsSnap.data().logoURL : undefined;

        let productId = planData.stripeProductId;

        // 1. Create or Update Stripe Product
        if (productId) {
            const productUpdatePayload: Stripe.ProductUpdateParams = {
                name: planData.name,
                description: planData.description || undefined,
            };
            if (logoURL) {
                productUpdatePayload.images = [logoURL];
            } else {
                productUpdatePayload.images = [];
            }
            await stripe.products.update(productId, productUpdatePayload);
        } else {
            const productCreatePayload: Stripe.ProductCreateParams = {
                name: planData.name,
                description: planData.description || undefined,
                type: 'service',
            };
            if (logoURL) {
                productCreatePayload.images = [logoURL];
            }
            const product = await stripe.products.create(productCreatePayload);
            productId = product.id;
        }

        // 2. Create new Stripe Prices for monthly interval
        let monthlyPriceId: string | undefined = undefined;
        if (planData.monthlyPrice >= 0) {
            const monthlyPrice = await stripe.prices.create({
                product: productId,
                unit_amount: Math.round(planData.monthlyPrice * 100),
                currency: 'brl',
                recurring: { interval: 'month' },
            });
            monthlyPriceId = monthlyPrice.id;
        }

        // 3. Create new Stripe Prices for yearly interval
        let yearlyPriceId: string | undefined = undefined;
        if (planData.yearlyPrice > 0) {
            const yearlyPrice = await stripe.prices.create({
                product: productId,
                unit_amount: Math.round(planData.yearlyPrice * 100),
                currency: 'brl',
                recurring: { interval: 'year' },
            });
            yearlyPriceId = yearlyPrice.id;
        }

        return {
            success: true,
            stripeProductId: productId,
            stripeMonthlyPriceId: monthlyPriceId,
            stripeYearlyPriceId: yearlyPriceId,
        };

    } catch (error: any) {
        console.error('Stripe Sync Error:', error);
        let errorMessage = 'Ocorreu um erro desconhecido ao sincronizar com o Stripe.';
        if (error instanceof Stripe.errors.StripeError) {
            errorMessage = `Erro do Stripe: ${error.message}`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }
}
