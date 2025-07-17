
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MailCheck, X } from 'lucide-react';
import Link from 'next/link';

export function VerificationBanner() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sendingVerification, setSendingVerification] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        try {
            const bannerClosed = localStorage.getItem('verificationBannerClosed') === 'true';
            if (user && !user.emailVerified && !bannerClosed) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } catch (error) {
            console.error("Could not access localStorage:", error);
            if (user && !user.emailVerified) {
                setIsVisible(true);
            }
        }
    }, [user]);

    const handleClose = () => {
        try {
            localStorage.setItem('verificationBannerClosed', 'true');
        } catch (error) {
            console.error("Could not write to localStorage:", error);
        }
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    const handleSendVerification = async () => {
        setSendingVerification(true);
        if (user) {
            try {
                await sendEmailVerification(user);
                toast({
                    title: 'E-mail Enviado',
                    description: 'Verifique sua caixa de entrada (e spam) para confirmar seu e-mail.',
                });
            } catch (err) {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Não foi possível enviar o e-mail de verificação. Tente novamente mais tarde.',
                });
            } finally {
                setSendingVerification(false);
            }
        } else {
             // Se o usuário for nulo, apenas resete o estado de envio.
            setSendingVerification(false);
        }
    };

    return (
        <div className="relative z-30 bg-amber-400/90 text-amber-900 shadow-sm">
            <div className="container mx-auto flex h-10 items-center justify-center px-4 md:px-6 lg:px-24">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <p className="text-xs sm:text-sm font-medium">
                            <span className="hidden sm:inline">Sua conta não está verificada.</span>
                            <Link href="/dashboard/perfil" className="underline font-bold ml-1">Clique aqui</Link> para gerenciar as configurações de segurança.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button 
                            asChild
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 h-7 text-xs"
                        >
                            <Link href="/dashboard/perfil">
                                <MailCheck className="mr-2 h-4 w-4" />
                                Verificar E-mail
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-900/80 hover:bg-amber-500/50 hover:text-amber-900" onClick={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
