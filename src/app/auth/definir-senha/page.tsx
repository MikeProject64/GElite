'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import Link from 'next/link';

const passwordSchema = z.object({
    newPassword: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não correspondem.',
    path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

function DefinirSenhaComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { newPassword: '', confirmPassword: '' },
    });

    useEffect(() => {
        if (!token) {
            setError('Token não encontrado. O link pode ser inválido ou ter expirado.');
        }
    }, [token]);

    const onSubmit = async (data: PasswordFormValues) => {
        if (!token) return;
        setIsLoading(true);
        setError(null);

        try {
            const executarAcao = httpsCallable(functions, 'executarAcaoUnificada');
            const result = await executarAcao({ token: token, novaSenha: data.newPassword });

            if ((result.data as { success: boolean }).success) {
                toast({
                    title: 'Sucesso!',
                    description: 'Seu e-mail foi verificado e sua senha foi definida com sucesso.',
                });
                setIsSuccess(true);
            } else {
                throw new Error('Ocorreu um erro desconhecido.');
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Não foi possível completar a ação. Tente novamente mais tarde.';
            setError(errorMessage);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <div className="w-full max-w-md p-8 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
                    <h2 className="text-2xl font-bold text-red-600">Link Inválido ou Expirado</h2>
                    <p className="text-gray-600 dark:text-gray-300">{error}</p>
                    <Link href="/login">
                        <Button>Voltar para o Login</Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    if (isSuccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <div className="w-full max-w-md p-8 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
                    <h2 className="text-2xl font-bold text-green-600">Tudo Pronto!</h2>
                    <p className="text-gray-600 dark:text-gray-300">Seu e-mail foi verificado e sua senha foi definida com sucesso.</p>
                    <Link href="/login">
                        <Button>Ir para o Login</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center">Definir Nova Senha</h2>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova Senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirmar Nova Senha</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}

export default function DefinirSenhaPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <DefinirSenhaComponent />
        </Suspense>
    );
} 