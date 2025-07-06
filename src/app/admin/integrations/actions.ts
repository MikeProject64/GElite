'use server';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';
import { z } from 'zod';

const AddTestCreditResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

type AddTestCreditResult = z.infer<typeof AddTestCreditResultSchema>;

export async function addTestCreditAction(amount: number): Promise<AddTestCreditResult> {
  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      throw new Error('Configurações do site não encontradas no banco de dados.');
    }

    const settingsData = settingsSnap.data();
    const stripeSecretKey = settingsData.stripeSecretKey;

    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_test_')) {
      return { success: false, message: 'Chave secreta de teste do Stripe não configurada ou inválida.' };
    }

    const stripe = new Stripe(stripeSecretKey);

    // To simulate crediting, we create a test customer and add a credit balance transaction.
    // This is a safe write operation to confirm API key validity.
    const customer = await stripe.customers.create({
        description: 'Cliente de Teste para Crédito via Painel',
        email: `test-customer-${Date.now()}@example.com`,
    });

    const transaction = await stripe.customers.createBalanceTransaction(customer.id, {
        amount: amount * 100, // Stripe expects amount in cents
        currency: 'brl',
        description: `Crédito de teste de R$${amount.toFixed(2)}`,
    });

    return {
      success: true,
      message: `Sucesso! Crédito de teste adicionado ao cliente de teste ${customer.id}. Transação: ${transaction.id}`,
    };
  } catch (error: any) {
    console.error('Stripe API error:', error);
    // Provide a more user-friendly error message
    let errorMessage = 'Ocorreu um erro desconhecido.';
    if (error instanceof Stripe.errors.StripeAuthenticationError) {
        errorMessage = 'Erro de autenticação. Verifique se sua chave secreta do Stripe está correta.';
    } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
        errorMessage = `Requisição inválida: ${error.message}`;
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    return { success: false, message: `Falha na conexão com o Stripe: ${errorMessage}` };
  }
}
