

'use server';

import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import type { Plan } from '@/types';
import * as fbq from '@/lib/meta-pixel-server';

async function getStripeInstance(): Promise<Stripe> {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists() || !settingsSnap.data().stripeSecretKey) {
        throw new Error('Chave secreta do Stripe não configurada pelo administrador do site.');
    }
    const stripeSecretKey = settingsSnap.data().stripeSecretKey;
    return new Stripe(stripeSecretKey);
}

// Function to send notification email. Placed here to be self-contained.
async function sendNewSubscriptionNotification(details: {
    newUser: { name: string; email: string },
    plan: Plan,
    subscription: Stripe.Subscription
}) {
    try {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const settingsSnap = await getDoc(settingsRef);

        if (!settingsSnap.exists()) {
            console.log("Configurações do site não encontradas. Email de notificação não enviado.");
            return;
        }

        const settings = settingsSnap.data();
        if (!settings.notifyOnNewSubscription || !settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword || !settings.emailRecipients?.length) {
            console.log("Configurações de SMTP ou notificação desabilitada. Email não enviado.");
            return;
        }

        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort,
            secure: settings.smtpPort === 465,
            auth: { user: settings.smtpUser, pass: settings.smtpPassword },
        });

        const subject = `🎉 Novo Assinante: ${details.newUser.name}`;
        const html = `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h2>Nova Assinatura no ${settings.siteName || 'Gestor Elite'}!</h2>
                <p>Um novo usuário acaba de se inscrever:</p>
                <ul>
                    <li><strong>Nome:</strong> ${details.newUser.name}</li>
                    <li><strong>E-mail:</strong> ${details.newUser.email}</li>
                </ul>
                <h3>Detalhes do Plano Assinado:</h3>
                <ul>
                    <li><strong>Plano:</strong> ${details.plan.name}</li>
                    <li><strong>Valor:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((details.subscription.items.data[0].price.unit_amount || 0) / 100)}</li>
                    <li><strong>Intervalo:</strong> ${details.subscription.items.data[0].price.recurring?.interval === 'year' ? 'Anual' : 'Mensal'}</li>
                </ul>
                <p>A assinatura foi criada em ${new Date(details.subscription.created * 1000).toLocaleString('pt-BR')}.</p>
            </div>
        `;

        await transporter.sendMail({
            from: `"${settings.siteName || 'Gestor Elite'}" <${settings.smtpUser}>`,
            to: settings.emailRecipients.join(', '),
            subject: subject,
            html: html,
        });

        console.log("E-mail de notificação de nova assinatura enviado com sucesso.");

    } catch (error) {
        console.error("Falha ao enviar e-mail de notificação de nova assinatura:", error);
        // Do not throw error here, as it's not critical for the user signup flow.
    }
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
        
        const price = subscription.items.data[0].price;
        const value = price.unit_amount ? price.unit_amount / 100 : 0;
        const currency = price.currency.toUpperCase();

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
            stripeCustomerId: customer.id,
            subscriptionStatus: 'active',
            subscriptionId: subscription.id,
        });
        
        let planData: Plan | null = null;
        try {
            const planRef = doc(db, 'plans', planId);
            const planSnap = await getDoc(planRef);
            if(planSnap.exists()){
                planData = { id: planSnap.id, ...planSnap.data() } as Plan;
                await sendNewSubscriptionNotification({
                    newUser: { name, email },
                    plan: planData,
                    subscription: subscription,
                });
                // Fire Meta Pixel Purchase event
                fbq.event('Purchase', {
                    value: value,
                    currency: currency,
                    content_name: planData.name,
                    content_ids: [planData.id],
                    content_type: 'product',
                });
            }
        } catch (eventError) {
            console.error("Erro no processo de envio de eventos ou e-mail:", eventError);
        }

        return { 
            success: true, 
            email: user.email, 
            value, 
            currency, 
            transaction_id: subscription.id,
            planId: planData?.id,
            planName: planData?.name,
        };

    } catch (error: any) {
        let errorMessage = error.message || 'Ocorreu um erro desconhecido.';
        if(error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este e-mail já foi utilizado para criar uma conta. Faça login para acessar seu painel.';
        }
        console.error("Error creating user after payment:", error);
        return { success: false, message: errorMessage };
    }
}
