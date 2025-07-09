
'use server';

import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subDays, format, eachDayOfInterval, startOfDay } from 'date-fns';

// Helper to get Stripe instance
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

// Data structure for the dashboard
export interface StripeDashboardData {
    success: boolean;
    message?: string;
    mrr?: number;
    revenueLast30Days?: number;
    activeSubscriptions?: number;
    avgRevenuePerUser?: number;
    recentCharges?: { id: string; amount: number; currency: string; created: number; customerEmail: string | null; receipt_url: string | null }[];
    dailyRevenue?: { date: string; total: number; }[];
    subscriptionBreakdown?: { name: string; count: number; }[];
}


export async function getStripeDashboardData(): Promise<StripeDashboardData> {
    try {
        const stripe = await getStripeInstance();
        
        let mrr = 0;
        let activeSubscriptions = 0;
        const subscriptionBreakdownMap = new Map<string, number>();
        const endDate = new Date();
        const startDate = subDays(endDate, 29);
        const thirtyDaysAgoTimestamp = Math.floor(startDate.getTime() / 1000);

        // 1. Calculate MRR, Active Subscriptions, and Breakdown
        for await (const subscription of stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.plan.product'] })) {
            activeSubscriptions++;
            const plan = subscription.plan;
            if (plan && plan.amount) {
                if (plan.interval === 'year') {
                    mrr += plan.amount / 12;
                } else if (plan.interval === 'month') {
                    mrr += plan.amount;
                }
            }
             // Subscription Breakdown Calculation
            const productName = (plan.product as Stripe.Product)?.name || 'Plano Desconhecido';
            subscriptionBreakdownMap.set(productName, (subscriptionBreakdownMap.get(productName) || 0) + 1);
        }

        const avgRevenuePerUser = activeSubscriptions > 0 ? (mrr / 100) / activeSubscriptions : 0;
        const subscriptionBreakdown = Array.from(subscriptionBreakdownMap.entries()).map(([name, count]) => ({ name, count }));

        // 2. Calculate Revenue and Daily Revenue for the last 30 days
        let revenueLast30Days = 0;
        const dailyRevenueMap = new Map<string, number>();
        const recentCharges: StripeDashboardData['recentCharges'] = [];

        for await (const charge of stripe.charges.list({ created: { gte: thirtyDaysAgoTimestamp }, limit: 100, expand: ['data.customer'] })) {
             if (charge.paid && !charge.refunded) {
                 revenueLast30Days += charge.amount;
                 const dateStr = format(startOfDay(new Date(charge.created * 1000)), 'yyyy-MM-dd');
                 dailyRevenueMap.set(dateStr, (dailyRevenueMap.get(dateStr) || 0) + charge.amount);

                 if (recentCharges.length < 5) {
                    recentCharges.push({
                        id: charge.id,
                        amount: charge.amount,
                        currency: charge.currency,
                        created: charge.created,
                        customerEmail: (charge.customer as Stripe.Customer)?.email || charge.billing_details.email || 'N/A',
                        receipt_url: charge.receipt_url,
                    });
                }
             }
        }
        
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyRevenue = allDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const total = dailyRevenueMap.get(dateStr) || 0;
            return {
                date: format(day, 'MMM dd'),
                total: total / 100,
            };
        });

        return {
            success: true,
            mrr: mrr / 100,
            revenueLast30Days: revenueLast30Days / 100,
            activeSubscriptions,
            avgRevenuePerUser,
            recentCharges,
            dailyRevenue,
            subscriptionBreakdown,
        };

    } catch (error: any) {
        console.error('Stripe API error (getDashboardData):', error);
        return { success: false, message: error.message || 'Falha ao buscar dados do Stripe.' };
    }
}
