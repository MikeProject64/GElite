
'use server';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Stripe from 'stripe';
import { z } from 'zod';

// Schema and type for the test charge action result
const TestActionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type TestActionResult = z.infer<typeof TestActionResultSchema>;

// Helper function to get Stripe instance
async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      throw new Error('Configurações do site não encontradas no banco de dados.');
    }

    const settingsData = settingsSnap.data();
    const stripeSecretKey = settingsData.stripeSecretKey;

    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_test_')) {
      throw new Error('Chave secreta de teste do Stripe não configurada ou inválida.');
    }
    
    return new Stripe(stripeSecretKey);
}

/**
 * Creates a one-time test charge using a test customer and payment method.
 * This simulates a real payment and should appear in the Stripe test dashboard.
 */
export async function createTestChargeAction(amount: number): Promise<TestActionResult> {
  try {
    const stripe = await getStripeInstance();
    
    // 1. Create a test customer
    const customer = await stripe.customers.create({
        description: 'Cliente de Teste para Pagamento Único',
        email: `test-customer-charge-${Date.now()}@example.com`,
    });

    // 2. Create and attach a test payment method (tok_visa is a test token)
    const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' },
    });
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
    
    // 3. Create and confirm a PaymentIntent (a one-time charge)
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Stripe expects amount in cents
        currency: 'brl',
        customer: customer.id,
        payment_method: paymentMethod.id,
        off_session: true, // Indicates the charge is happening off-session
        confirm: true, // Confirm the payment immediately
    });

    return {
      success: true,
      message: `Cobrança de teste de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} criada com sucesso! ID: ${paymentIntent.id}`,
    };
  } catch (error: any) {
    console.error('Stripe API error (createTestChargeAction):', error);
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


/**
 * Creates a recurring test subscription for a given monthly amount.
 * This simulates a user signing up for a recurring plan.
 */
export async function createTestSubscriptionAction(amount: number): Promise<TestActionResult> {
    try {
        const stripe = await getStripeInstance();
        
        const settingsRef = doc(db, 'siteConfig', 'main');
        const settingsSnap = await getDoc(settingsRef);
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};
        const logoURL = settingsData.logoURL;
        const siteName = 'Gestor Elite';


        // 1. Find or create a test product for subscriptions
        const testProductName = `${siteName} - Produto de Assinatura Teste`;
        const products = await stripe.products.list({ active: true });
        let product = products.data.find(p => p.name === testProductName);
        if (!product) {
            const createPayload: Stripe.ProductCreateParams = { name: testProductName, type: 'service' };
            if (logoURL) createPayload.images = [logoURL];
            product = await stripe.products.create(createPayload);
        } else {
            // Product already exists, maybe update it with the logo
            const updatePayload: Stripe.ProductUpdateParams = { name: testProductName };
            if (logoURL) updatePayload.images = [logoURL];
            await stripe.products.update(product.id, updatePayload);
        }

        // 2. Create a recurring price for that product
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: amount * 100, // Amount in cents
            currency: 'brl',
            recurring: { interval: 'month' },
        });

        // 3. Create a test customer
        const customer = await stripe.customers.create({
            description: 'Cliente de Teste para Assinatura Recorrente',
            email: `test-customer-sub-${Date.now()}@example.com`,
        });

        // 4. Create and attach a test payment method
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: { token: 'tok_visa' },
        });
        await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
        await stripe.customers.update(customer.id, {
            invoice_settings: { default_payment_method: paymentMethod.id },
        });

        // 5. Create the subscription
        const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: price.id }],
        });

        return {
            success: true,
            message: `Assinatura de teste de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}/mês criada com sucesso! ID: ${subscription.id}`,
        };
    } catch (error: any) {
        console.error('Stripe API error (createTestSubscriptionAction):', error);
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
