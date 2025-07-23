
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getAccountInfo } from './actions'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function TeamLoginPage({ params }: { params: { accountId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const accountId = params.accountId;

  const [isLoading, setIsLoading] = useState(true);
  const [isValidAccount, setIsValidAccount] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!accountId) {
      setIsValidAccount(false);
      setErrorMessage('ID da conta não fornecido na URL.');
      setIsLoading(false);
      return;
    }

    async function fetchAccountInfo() {
      const result = await getAccountInfo(accountId);
      if (result.success) {
        setIsValidAccount(true);
        setAccountName(result.companyName || result.accountOwnerName || 'Equipe');
      } else {
        setIsValidAccount(false);
        setErrorMessage(result.message);
      }
      setIsLoading(false);
    }
    fetchAccountInfo();
  }, [accountId]);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        router.push('/dashboard');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Erro no Login',
            description: 'E-mail ou senha incorretos. Por favor, tente novamente.'
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificando informações da conta...</p>
      </div>
    );
  }
  
  if (!isValidAccount) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
         <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle className='flex items-center justify-center gap-2'><ShieldAlert className="h-6 w-6 text-destructive"/> Conta Inválida</CardTitle>
                <CardDescription>Não foi possível encontrar a página de login.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-destructive-foreground bg-destructive/10 p-3 rounded-md">{errorMessage}</p>
                <p className="mt-4 text-sm text-muted-foreground">Verifique se o link de acesso está correto.</p>
                 <Button asChild className='mt-4'>
                    <Link href="/">Voltar para a Página Inicial</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        
        <div className="text-center mb-6 px-4">
            <p className="text-muted-foreground">Acessar o painel da equipe</p>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl text-primary">
                {accountName}
            </h1>
        </div>

        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle>Login da Equipe</CardTitle>
                <CardDescription>Use seu e-mail e senha para entrar.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Seu E-mail</FormLabel>
                                <FormControl><Input type="email" {...field} placeholder="seu@email.com" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sua Senha</FormLabel>
                                <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Entrar
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
} 