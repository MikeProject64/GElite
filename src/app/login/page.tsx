
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wrench } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { availableIcons } from '@/components/icon-map';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido para redefinir a senha.' }),
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const MAX_RESET_ATTEMPTS = 3;
const RESET_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginDisabledUntil, setLoginDisabledUntil] = useState<number | null>(null);
  const [resetAttempts, setResetAttempts] = useState(0);
  const [resetDisabledUntil, setResetDisabledUntil] = useState<number | null>(null);

  const { settings } = useSettings();
  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'Gestor Elite';

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const resetForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  // Handle impersonation login
  useEffect(() => {
    const impersonateToken = searchParams.get('impersonate_token');
    if (impersonateToken) {
      setIsImpersonating(true);
      const handleImpersonation = async () => {
        try {
          await signInWithCustomToken(auth, impersonateToken);
          toast({
            title: 'Sessão Iniciada com Sucesso',
            description: 'Você agora está navegando como o usuário selecionado.',
          });
          router.push('/dashboard');
        } catch (error) {
          console.error('Falha ao logar como usuário:', error);
          toast({
            variant: 'destructive',
            title: 'Erro de Autenticação',
            description: 'O token de acesso é inválido ou expirou. Tente novamente.',
          });
          setIsImpersonating(false);
           router.replace('/login', undefined);
        }
      };
      handleImpersonation();
    }
  }, [searchParams, router, toast]);

  const getTimeRemaining = (until: number) => {
    const remaining = Math.ceil((until - Date.now()) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}m ${seconds}s`;
  };

  const handleLoginSubmit = async (values: z.infer<typeof loginFormSchema>) => {
    const now = Date.now();
    if (loginDisabledUntil && now < loginDisabledUntil) {
      toast({
        variant: 'destructive',
        title: 'Muitas tentativas de login',
        description: `Por favor, aguarde ${getTimeRemaining(loginDisabledUntil)} para tentar novamente.`,
      });
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      setLoginAttempts(0); // Reset on success
      setLoginDisabledUntil(null);
      router.push('/dashboard');
    } catch (error: any) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const disabledUntil = now + LOGIN_COOLDOWN_MS;
        setLoginDisabledUntil(disabledUntil);
        setLoginAttempts(0);
         toast({
          variant: 'destructive',
          title: 'Muitas tentativas de login',
          description: `Sua conta foi bloqueada temporariamente por segurança. Tente novamente em 5 minutos.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no Login',
          description: `E-mail ou senha incorretos. Tentativa ${newAttempts} de ${MAX_LOGIN_ATTEMPTS}.`,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    const now = Date.now();
    if (resetDisabledUntil && now < resetDisabledUntil) {
      toast({
        variant: 'destructive',
        title: 'Muitas solicitações',
        description: `Por favor, aguarde ${getTimeRemaining(resetDisabledUntil)} para tentar novamente.`,
      });
      return;
    }

    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: 'E-mail enviado!',
        description: 'Verifique sua caixa de entrada para as instruções de redefinição de senha.',
      });
      setIsResetDialogOpen(false);
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail. Verifique se o endereço está correto.',
      });
    } finally {
        const newAttempts = resetAttempts + 1;
        setResetAttempts(newAttempts);
        if (newAttempts >= MAX_RESET_ATTEMPTS) {
            const disabledUntil = now + RESET_COOLDOWN_MS;
            setResetDisabledUntil(disabledUntil);
            setResetAttempts(0);
        }
        setIsResetting(false);
    }
  };

  // Effect to clear disabled state after cooldown
  useEffect(() => {
    let loginTimer: NodeJS.Timeout;
    if (loginDisabledUntil) {
      loginTimer = setTimeout(() => setLoginDisabledUntil(null), loginDisabledUntil - Date.now());
    }
    let resetTimer: NodeJS.Timeout;
    if (resetDisabledUntil) {
      resetTimer = setTimeout(() => setResetDisabledUntil(null), resetDisabledUntil - Date.now());
    }
    return () => {
      clearTimeout(loginTimer);
      clearTimeout(resetTimer);
    };
  }, [loginDisabledUntil, resetDisabledUntil]);

  const isLoginButtonDisabled = isLoading || !!loginDisabledUntil;
  const isResetButtonDisabled = isResetting || !!resetDisabledUntil;
  
  if (isImpersonating) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold">Autenticando como usuário...</h2>
            <p className="text-muted-foreground">Por favor, aguarde.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
               <Icon className="h-8 w-8 text-primary" />
               <h1 className="text-3xl font-bold font-headline">{siteName}</h1>
            </div>
            <CardDescription>Acesse sua conta para gerenciar seus serviços.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="text-right">
                    <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={() => setIsResetDialogOpen(true)}>
                        Esqueci minha senha
                    </Button>
                </div>
                <Button type="submit" className="w-full" disabled={isLoginButtonDisabled}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar'}
                </Button>
                 <div className="mt-4 text-center text-sm">
                    Não tem uma conta?{" "}
                    <Link href="/#pricing" className="underline">
                        Cadastre-se
                    </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Redefinir Senha</DialogTitle>
                <DialogDescription>
                    Digite seu e-mail abaixo. Se houver uma conta associada a ele, enviaremos um link para você criar uma nova senha.
                </DialogDescription>
            </DialogHeader>
            <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handlePasswordResetSubmit)} className="space-y-4">
                    <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isResetButtonDisabled}>
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar E-mail de Redefinição
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
