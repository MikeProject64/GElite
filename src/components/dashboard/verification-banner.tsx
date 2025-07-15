
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MailCheck } from 'lucide-react';
import Link from 'next/link';

export function VerificationBanner() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [sendingVerification, setSendingVerification] = useState(false);

    if (!user || user.emailVerified) {
        return null;
    }

    const handleSendVerification = async () => {
        setSendingVerification(true);
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
    };

    return (
        <div className="fixed top-12 left-0 right-0 z-40 bg-amber-400/90 backdrop-blur-sm text-amber-900 shadow-md">
            <div className="container mx-auto flex h-12 items-center justify-center px-4 md:px-6 lg:px-24">
                <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-medium">
                            <span className="hidden sm:inline">Sua conta não está verificada.</span>
                            <Link href="/dashboard/perfil" className="underline font-bold ml-1">Clique aqui</Link> para reenviar o e-mail de confirmação.
                        </p>
                    </div>
                     <Button 
                        onClick={handleSendVerification} 
                        disabled={sendingVerification} 
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                    >
                        <MailCheck className="mr-2 h-4 w-4" />
                        {sendingVerification ? 'Enviando...' : 'Reenviar E-mail'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
