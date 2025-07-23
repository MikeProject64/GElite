'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { validateInviteToken, registerTeamMember } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  token: z.string().nonempty(),
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type FormData = z.infer<typeof formSchema>;

function RegistrationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [mainAccountId, setMainAccountId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { token: token || '', name: '', email: '', password: '' },
  });

  useEffect(() => {
    if (!token) {
      setMessage('Link de convite inválido ou ausente.');
      setIsValid(false);
      setIsLoading(false);
      return;
    }

    async function validateToken() {
      const result = await validateInviteToken(token);
      if (result.success) {
        setIsValid(true);
        form.setValue('name', result.collaboratorName || '');
        setAccountName(result.companyName || result.accountOwnerName || 'a equipe');
        setMainAccountId(result.mainAccountId || null);
      } else {
        setIsValid(false);
        setMessage(result.message);
      }
      setIsLoading(false);
    }
    validateToken();
  }, [token, form]);

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    const result = await registerTeamMember(data);
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
      setRegistrationSuccess(true);
    } else {
      toast({ variant: 'destructive', title: 'Erro no Cadastro', description: result.message });
    }
    setIsSubmitting(false);
  }
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificando convite...</p>
      </div>
    );
  }

  if (registrationSuccess) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <div className="mb-6">
                <CheckCircle className="h-20 w-20 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Cadastro Concluído!</h1>
            <p className="text-muted-foreground mb-6">
                Sua conta de membro da equipe para <span className="font-semibold text-primary">{accountName}</span> foi criada com sucesso.
            </p>
            
            <Separator className="my-4" />

            <div className="w-full text-left mt-4">
                <h3 className="font-semibold text-lg mb-2">Próximo Passo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Clique no botão abaixo para acessar a página de login exclusiva da sua equipe. 
                    Use o e-mail e a senha que você acabou de cadastrar.
                </p>
                <Button asChild className="w-full">
                    <Link href={mainAccountId ? `/login/${mainAccountId}` : '/login'}>Ir para a Página de Login</Link>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
         <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle className='flex items-center justify-center gap-2'><ShieldAlert className="h-6 w-6 text-destructive"/> Convite Inválido</CardTitle>
                <CardDescription>Não foi possível processar seu convite.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-destructive-foreground bg-destructive/10 p-3 rounded-md">{message}</p>
                <p className="mt-4 text-sm text-muted-foreground">Por favor, peça ao administrador da conta para gerar um novo link de convite.</p>
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
        
        {accountName && (
            <div className="text-center mb-6 px-4">
                <p className="text-muted-foreground">Você foi convidado(a) para a equipe de</p>
                <h1 className="text-3xl font-bold tracking-tight lg:text-4xl text-primary">
                    {accountName}
                </h1>
            </div>
        )}

        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle>Crie sua Conta de Membro</CardTitle>
                <CardDescription>Preencha seus dados para acessar o painel.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Seu Nome Completo</FormLabel>
                                <FormControl><Input {...field} readOnly className="bg-muted/50 focus-visible:ring-transparent" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Seu E-mail de Acesso</FormLabel>
                                <FormControl><Input type="email" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Crie uma Senha</FormLabel>
                                <FormControl><Input type="password" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar minha conta
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}


export default function RegistrarEquipePage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <RegistrationForm />
        </Suspense>
    )
} 