
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Rocket, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';

export function TrialBanner() {
    const { systemUser } = useAuth();
    const [daysLeft, setDaysLeft] = useState<number | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const isOnTrial = systemUser?.subscriptionStatus === 'trialing' && systemUser.trialEndsAt;

    useEffect(() => {
        try {
            const bannerClosed = localStorage.getItem('trialBannerClosed') === 'true';
            if (isOnTrial && !bannerClosed && systemUser?.trialEndsAt) {
                const endDate = systemUser.trialEndsAt.toDate();
                const now = new Date();
                const startOfEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                const days = differenceInDays(startOfEndDate, startOfNow);
                setDaysLeft(Math.max(0, days));
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } catch (error) {
            console.error("Could not access localStorage:", error);
            setIsVisible(true); 
        }
    }, [isOnTrial, systemUser?.trialEndsAt]);

    const handleClose = () => {
        try {
            localStorage.setItem('trialBannerClosed', 'true');
        } catch (error) {
            console.error("Could not write to localStorage:", error);
        }
        setIsVisible(false);
    };

    if (!isVisible || !isOnTrial || daysLeft === null || (systemUser?.trialEndsAt && systemUser.trialEndsAt.toDate() < new Date())) {
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
        <div className="relative z-40 bg-primary text-primary-foreground shadow-sm">
            <div className="container mx-auto flex h-10 items-center justify-center px-4 md:px-6 lg:px-24">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        <p className="text-xs sm:text-sm font-medium">{getMessage()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="secondary" className="shrink-0 h-7 text-xs">
                            <Link href="/dashboard/plans">
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Assinar um Plano
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/80 hover:bg-primary/80 hover:text-primary-foreground" onClick={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
