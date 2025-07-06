
'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { getSessionEmail, verifyCheckoutAndCreateUser } from './actions';

const formSchema = z.object({
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

function CompleteRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      toast({ title: 'Erro', description: 'ID de sessão inválido.', variant: 'destructive' });
      router.push('/#pricing');
      return;
    }

    const fetchEmail = async () => {
        const result = await getSessionEmail(sessionId);
        if (result.email) {
            setEmail(result.email);
        } else {
            toast({ title: 'Erro', description: result.error || 'Não foi possível verificar seu pagamento.', variant: 'destructive'});
            router.push('/#pricing');
        }
        setIsVerifying(false);
    };
    fetchEmail();
  }, [sessionId, router, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyCheckoutAndCreateUser(sessionId, values.password);
      if (!result.success || !result.email) {
        throw new Error(result.message || 'Falha ao criar a conta.');
      }

      toast({
        title: 'Conta Criada com Sucesso!',
        description: 'Você será redirecionado para o painel de controle.',
      });

      // Log the user in automatically
      await signInWithEmailAndPassword(auth, result.email, values.password);
      router.push('/dashboard');

    } catch (error: any) {
      setError(error.message);
      toast({
        variant: 'destructive',
        title: 'Erro ao Criar Conta',
        description: error.message,
      });
      setIsLoading(false);
    }
  };

  if (isVerifying) {
     return (
        <Card className="w-full max-w-sm">
            <CardHeader className='items-center text-center'>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <CardTitle className="text-2xl font-headline">Verificando Pagamento...</CardTitle>
                <CardDescription>Aguarde um momento, estamos confirmando sua assinatura.</CardDescription>
            </CardHeader>
        </Card>
     );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <CheckCircle className='h-12 w-12 text-green-500' />
        <CardTitle className="text-2xl font-headline">Pagamento Aprovado!</CardTitle>
        <CardDescription>Agora, crie uma senha para acessar sua conta com o e-mail <span className='font-bold text-foreground'>{email}</span>.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crie sua Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Finalizar Cadastro e Acessar'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


export default function CompleteRegistrationPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-background p-4">
            <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <CompleteRegistrationForm />
            </Suspense>
        </main>
    );
}
