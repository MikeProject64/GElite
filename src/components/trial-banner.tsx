'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Rocket, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function TrialBanner() {
    const { systemUser } = useAuth();
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    const isOnTrial = systemUser?.subscriptionStatus === 'trialing' && systemUser.trialEndsAt;

    useEffect(() => {
        if (isOnTrial) {
            const endDate = systemUser.trialEndsAt.toDate();
            const now = new Date();
            // Ensure we compare dates only, not times, to get an accurate day count
            const startOfEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            const days = differenceInDays(startOfEndDate, startOfNow);
            setDaysLeft(Math.max(0, days));
        }
    }, [isOnTrial, systemUser?.trialEndsAt]);

    if (!isOnTrial || daysLeft === null || (systemUser?.trialEndsAt && systemUser.trialEndsAt.toDate() < new Date())) {
        return null;
    }

    const getMessage = () => {
        if (daysLeft > 1) {
            return `Seu teste gratuito termina em ${daysLeft} dias.`;
        }
        if (daysLeft === 1) {
            return 'Seu teste gratuito termina amanhã!';
        }
        return 'Seu teste gratuito termina hoje!';
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 backdrop-blur-sm text-primary-foreground shadow-md">
            <div className="container mx-auto flex h-14 items-center justify-center px-4 md:px-6 lg:px-24">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Rocket className="h-5 w-5" />
                        <p className="text-sm font-medium">{getMessage()}</p>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="shrink-0">
                        <Link href="/dashboard/subscription">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Assinar um Plano
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
