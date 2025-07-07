
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, KeyRound, DollarSign, CreditCard, Repeat, MessageSquare, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { createTestChargeAction, createTestSubscriptionAction } from './actions';
import { Textarea } from '@/components/ui/textarea';

const stripeFormSchema = z.object({
  stripePublishableKey: z.string().startsWith('pk_').optional().or(z.literal('')),
  stripeSecretKey: z.string().startsWith('sk_').optional().or(z.literal('')),
});
type StripeFormValues = z.infer<typeof stripeFormSchema>;

const whatsappFormSchema = z.object({
  whatsappNumber: z.string().optional().or(z.literal('')),
  whatsappMessage: z.string().optional().or(z.literal('')),
});
type WhatsAppFormValues = z.infer<typeof whatsappFormSchema>;

const emailFormSchema = z.object({
  emailFrom: z.string().email({ message: 'Por favor, insira um e-mail válido.' }).optional().or(z.literal('')),
  emailRecipients: z.string().optional(),
});
type EmailFormValues = z.infer<typeof emailFormSchema>;


const testChargeFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'O valor deve ser maior que zero.' }),
});
type TestChargeFormValues = z.infer<typeof testChargeFormSchema>;

const testSubscriptionFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'O valor deve ser maior que zero.' }),
});
type TestSubscriptionFormValues = z.infer<typeof testSubscriptionFormSchema>;


function StripeSettingsForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<StripeFormValues>({
        resolver: zodResolver(stripeFormSchema),
        defaultValues: {
            stripePublishableKey: '',
            stripeSecretKey: '',
        },
    });

    const testChargeForm = useForm<TestChargeFormValues>({
        resolver: zodResolver(testChargeFormSchema),
        defaultValues: { amount: 50.00 },
    });

    const testSubscriptionForm = useForm<TestSubscriptionFormValues>({
        resolver: zodResolver(testSubscriptionFormSchema),
        defaultValues: { amount: 29.99 },
    });

    const watchedStripeKey = form.watch('stripePublishableKey');
    const isTestMode = watchedStripeKey?.startsWith('pk_test_');

    useEffect(() => {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({
                    stripePublishableKey: data.stripePublishableKey || '',
                    stripeSecretKey: data.stripeSecretKey || '',
                });
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [form]);

    const onSubmit = async (data: StripeFormValues) => {
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'siteConfig', 'main');
            await setDoc(settingsRef, data, { merge: true });
            toast({
                title: 'Sucesso!',
                description: 'Suas chaves do Stripe foram salvas.',
            });
        } catch (error) {
            console.error('Error updating Stripe settings:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar as chaves do Stripe.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const onTestChargeSubmit = async (data: TestChargeFormValues) => {
        const result = await createTestChargeAction(data.amount);
        if (result.success) {
            toast({ title: 'Ação de Teste Realizada!', description: result.message });
        } else {
             toast({ variant: 'destructive', title: 'Erro na Ação de Teste', description: result.message });
        }
    };
    
    const onTestSubscriptionSubmit = async (data: TestSubscriptionFormValues) => {
        const result = await createTestSubscriptionAction(data.amount);
         if (result.success) {
            toast({ title: 'Ação de Teste Realizada!', description: result.message });
        } else {
             toast({ variant: 'destructive', title: 'Erro na Ação de Teste', description: result.message });
        }
    };

    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
      )
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="stripePublishableKey"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Chave Publicável do Stripe</FormLabel>
                                <FormControl><Input placeholder="pk_test_..." {...field} /></FormControl>
                                <FormDescription>Sua chave publicável do Stripe. Encontrada no painel do Stripe.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="stripeSecretKey"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Chave Secreta do Stripe</FormLabel>
                                <FormControl><Input type="password" placeholder="sk_test_..." {...field} /></FormControl>
                                <FormDescription>Sua chave secreta do Stripe. Mantenha esta chave segura e nunca a exponha no lado do cliente.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                        Salvar Chaves do Stripe
                    </Button>
                </form>
            </Form>

            {isTestMode && (
                 <>
                    <Separator className="my-8" />
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Modo de Teste Ativado</h3>
                        <p className="text-sm text-muted-foreground">
                            Você está usando chaves de teste. As ações abaixo são para fins de desenvolvimento e não afetarão seus dados reais.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2"><CreditCard />Testar Pagamento Único</CardTitle>
                                    <CardDescription>Cria uma cobrança de teste para um cliente fictício.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...testChargeForm}>
                                        <form onSubmit={testChargeForm.handleSubmit(onTestChargeSubmit)} className="flex flex-col sm:flex-row sm:items-end gap-4">
                                            <FormField
                                                control={testChargeForm.control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem className="flex-grow">
                                                        <FormLabel>Valor (R$)</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                <Input type="number" step="0.01" placeholder="50.00" className="pl-10" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="submit" disabled={testChargeForm.formState.isSubmitting} className="w-full sm:w-auto">
                                                {testChargeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Testar Cobrança
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2"><Repeat /> Testar Assinatura</CardTitle>
                                    <CardDescription>Cria uma assinatura mensal de teste para um cliente fictício.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Form {...testSubscriptionForm}>
                                        <form onSubmit={testSubscriptionForm.handleSubmit(onTestSubscriptionSubmit)} className="flex flex-col sm:flex-row sm:items-end gap-4">
                                            <FormField
                                                control={testSubscriptionForm.control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem className="flex-grow">
                                                        <FormLabel>Valor Mensal (R$)</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                <Input type="number" step="0.01" placeholder="29.99" className="pl-10" {...field} />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="submit" disabled={testSubscriptionForm.formState.isSubmitting} className="w-full sm:w-auto">
                                                {testSubscriptionForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Testar Assinatura
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

function WhatsAppSettingsForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<WhatsAppFormValues>({
        resolver: zodResolver(whatsappFormSchema),
        defaultValues: {
            whatsappNumber: '',
            whatsappMessage: 'Olá! Preciso de ajuda com o sistema.',
        },
    });

    useEffect(() => {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({
                    whatsappNumber: data.whatsappNumber || '',
                    whatsappMessage: data.whatsappMessage || 'Olá! Preciso de ajuda com o sistema.',
                });
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [form]);

    const onSubmit = async (data: WhatsAppFormValues) => {
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'siteConfig', 'main');
            await setDoc(settingsRef, data, { merge: true });
            toast({
                title: 'Sucesso!',
                description: 'As configurações do WhatsApp foram salvas.',
            });
        } catch (error) {
            console.error('Error updating WhatsApp settings:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar as configurações.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-20 w-full" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
      )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Número do WhatsApp para Suporte</FormLabel>
                            <FormControl><Input placeholder="5511999998888" {...field} /></FormControl>
                            <FormDescription>Insira o número completo com código do país e DDD, sem símbolos. Ex: 5511999998888</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="whatsappMessage"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mensagem Padrão</FormLabel>
                            <FormControl><Textarea placeholder="Olá! Preciso de ajuda..." {...field} /></FormControl>
                            <FormDescription>Esta mensagem será pré-preenchida quando o usuário clicar no botão de suporte.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSaving}>
                    {isSaving ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                    Salvar Configurações do WhatsApp
                </Button>
            </form>
        </Form>
    );
}

function EmailSettingsForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: { emailFrom: '', emailRecipients: '' },
    });

    useEffect(() => {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({
                    emailFrom: data.emailFrom || '',
                    emailRecipients: (data.emailRecipients || []).join('\n'),
                });
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [form]);

    const onSubmit = async (data: EmailFormValues) => {
        setIsSaving(true);
        try {
            const recipientsArray = data.emailRecipients
                ?.split('\n')
                .map(email => email.trim())
                .filter(email => email) || [];

            const settingsRef = doc(db, 'siteConfig', 'main');
            await setDoc(settingsRef, { 
                emailFrom: data.emailFrom,
                emailRecipients: recipientsArray
             }, { merge: true });
            
            toast({
                title: 'Sucesso!',
                description: 'As configurações de e-mail foram salvas.',
            });
        } catch (error) {
            console.error('Error updating Email settings:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar as configurações de e-mail.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-20 w-full" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
      )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="emailFrom"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>E-mail Remetente (De:)</FormLabel>
                            <FormControl><Input type="email" placeholder="contato@seusite.com" {...field} /></FormControl>
                            <FormDescription>
                                O endereço de e-mail que aparecerá como remetente. Este domínio deve ser verificado no seu provedor de e-mail (ex: SendGrid).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="emailRecipients"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Destinatários de Notificação</FormLabel>
                            <FormControl><Textarea placeholder="email1@exemplo.com&#10;email2@exemplo.com" {...field} rows={4} /></FormControl>
                            <FormDescription>
                                Uma lista de e-mails que receberão notificações do sistema. Insira um e-mail por linha.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSaving}>
                    {isSaving ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                    Salvar Configurações de E-mail
                </Button>
            </form>
        </Form>
    );
}

export default function AdminIntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
      <Tabs defaultValue="stripe" className="w-full">
        <TabsList>
          <TabsTrigger value="stripe">
            <KeyRound className="mr-2 h-4 w-4" /> Stripe
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="mr-2 h-4 w-4" /> Suporte WhatsApp
          </TabsTrigger>
           <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" /> Email
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stripe">
          <Card>
              <CardHeader>
                  <CardTitle>Configuração do Stripe</CardTitle>
                  <CardDescription>Conecte sua conta do Stripe para processar pagamentos.</CardDescription>
              </CardHeader>
              <CardContent>
                  <StripeSettingsForm />
              </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="whatsapp">
          <Card>
              <CardHeader>
                  <CardTitle>Configuração do Suporte via WhatsApp</CardTitle>
                  <CardDescription>Adicione um botão flutuante no sistema para seus usuários entrarem em contato.</CardDescription>
              </CardHeader>
              <CardContent>
                  <WhatsAppSettingsForm />
              </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="email">
          <Card>
              <CardHeader>
                  <CardTitle>Configuração de Envio de E-mail</CardTitle>
                  <CardDescription>
                      Configure o remetente e os destinatários para os e-mails transacionais do sistema. O envio real é gerenciado pela extensão "Trigger Email" do Firebase.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <EmailSettingsForm />
              </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
