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

    if (!stripeSecretKey) {
      throw new Error('Chave secreta do Stripe não configurada.');
    }
    
    return new Stripe(stripeSecretKey);
}

export async function getActiveSubscriptionCount(): Promise<{ success: boolean; count?: number, message?: string }> {
  try {
    const stripe = await getStripeInstance();
    
    let count = 0;
    // The `list` method with `for await` automatically handles pagination.
    for await (const subscription of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
      count++;
    }
    
    return { success: true, count: count };
    
  } catch (error: any) {
    console.error('Stripe API error (getActiveSubscriptionCount):', error);
    return { success: false, message: error.message || 'Falha ao buscar dados do Stripe.' };
  }
}
