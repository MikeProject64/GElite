
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
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, KeyRound, DollarSign, CreditCard, Repeat, MessageSquare, Mail, Send, TrendingUp, FileUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { createTestChargeAction, createTestSubscriptionAction, sendTestEmailAction, sendWhatsAppTestMessageAction } from './actions';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

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
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().email({ message: 'E-mail inválido.' }).optional().or(z.literal('')),
  smtpPassword: z.string().optional(),
  emailRecipients: z.string().optional(),
  notifyOnNewSubscription: z.boolean().default(false),
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

const whatsappApiFormSchema = z.object({
  whatsAppBusinessAccountId: z.string().optional(),
  whatsAppAccessToken: z.string().optional(),
});
type WhatsAppApiFormValues = z.infer<typeof whatsappApiFormSchema>;

const testWhatsAppFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'Número de telefone inválido.' }),
});
type TestWhatsAppFormValues = z.infer<typeof testWhatsAppFormSchema>;

const googleAnalyticsFormSchema = z.object({
  ga4PropertyId: z.string().optional().or(z.literal('')),
  ga4CredentialsJson: z.string().optional().or(z.literal('')),
});
type GoogleAnalyticsFormValues = z.infer<typeof googleAnalyticsFormSchema>;

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
    const [isTesting, setIsTesting] = useState(false);

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: { 
            smtpHost: '',
            smtpPort: 465,
            smtpUser: '',
            smtpPassword: '',
            emailRecipients: '',
            notifyOnNewSubscription: false,
        },
    });

    useEffect(() => {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({
                    smtpHost: data.smtpHost || '',
                    smtpPort: data.smtpPort || 465,
                    smtpUser: data.smtpUser || '',
                    smtpPassword: data.smtpPassword || '',
                    emailRecipients: (data.emailRecipients || []).join('\n'),
                    notifyOnNewSubscription: data.notifyOnNewSubscription || false,
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
                smtpHost: data.smtpHost,
                smtpPort: data.smtpPort,
                smtpUser: data.smtpUser,
                smtpPassword: data.smtpPassword,
                emailRecipients: recipientsArray,
                notifyOnNewSubscription: data.notifyOnNewSubscription
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

    const handleSendTestEmail = async () => {
        setIsTesting(true);
        const result = await sendTestEmailAction();
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Falha no Teste', description: result.message });
        }
        setIsTesting(false);
    }

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
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="smtpHost" render={({ field }) => (
                            <FormItem><FormLabel>Host SMTP</FormLabel><FormControl><Input placeholder="smtp.seudominio.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="smtpPort" render={({ field }) => (
                            <FormItem><FormLabel>Porta SMTP</FormLabel><FormControl><Input type="number" placeholder="465" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="smtpUser" render={({ field }) => (
                            <FormItem><FormLabel>Usuário SMTP (E-mail)</FormLabel><FormControl><Input type="email" placeholder="contato@seudominio.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="smtpPassword" render={({ field }) => (
                            <FormItem><FormLabel>Senha SMTP</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>

                    <FormField control={form.control} name="emailRecipients" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Destinatários de Notificação</FormLabel>
                            <FormControl><Textarea placeholder="email1@exemplo.com\nemail2@exemplo.com" {...field} rows={4} /></FormControl>
                            <FormDescription>
                                Uma lista de e-mails que receberão notificações do sistema. Insira um e-mail por linha.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    
                    <Separator />

                    <FormField
                        control={form.control}
                        name="notifyOnNewSubscription"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Notificar Nova Assinatura</FormLabel>
                                    <FormDescription>
                                        Enviar um e-mail para os destinatários acima sempre que um novo usuário assinar um plano.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                        Salvar Credenciais e Regras
                    </Button>
                </form>
            </Form>
            <Separator className="my-8" />
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Testar Configuração</h3>
                <p className="text-sm text-muted-foreground">
                    Após salvar suas credenciais, clique no botão abaixo para enviar um e-mail de teste para os destinatários configurados.
                </p>
                <Button onClick={handleSendTestEmail} disabled={isTesting}>
                    {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar Email de Teste
                </Button>
            </div>
        </>
    );
}

function WhatsAppApiSettingsForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<WhatsAppApiFormValues>({
        resolver: zodResolver(whatsappApiFormSchema),
        defaultValues: {
            whatsAppBusinessAccountId: '',
            whatsAppAccessToken: '',
        },
    });

    const testForm = useForm<TestWhatsAppFormValues>({
        resolver: zodResolver(testWhatsAppFormSchema),
        defaultValues: { phoneNumber: '5511961891302' },
    });

    useEffect(() => {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({
                    whatsAppBusinessAccountId: data.whatsAppBusinessAccountId || '',
                    whatsAppAccessToken: data.whatsAppAccessToken || '',
                });
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [form]);

    const onSubmit = async (data: WhatsAppApiFormValues) => {
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'siteConfig', 'main');
            await setDoc(settingsRef, data, { merge: true });
            toast({
                title: 'Sucesso!',
                description: 'Suas credenciais do WhatsApp API foram salvas.',
            });
        } catch (error) {
            console.error('Error updating WhatsApp API settings:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar as credenciais.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const onTestSubmit = async (data: TestWhatsAppFormValues) => {
        const result = await sendWhatsAppTestMessageAction(data.phoneNumber);
        if (result.success) {
            toast({ title: 'Sucesso!', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Erro no Teste', description: result.message });
        }
    };

    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
      );
    }

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="whatsAppBusinessAccountId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>ID da Conta Empresarial do WhatsApp</FormLabel>
                                <FormControl><Input placeholder="Ex: 123456789012345" {...field} /></FormControl>
                                <FormDescription>Encontrado no seu Gerenciador de Negócios da Meta.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="whatsAppAccessToken"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Token de Acesso Permanente</FormLabel>
                                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                <FormDescription>Gere um token de acesso permanente para sua aplicação.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Credenciais
                    </Button>
                </form>
            </Form>
            <Separator className="my-8" />
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Testar API</h3>
                <p className="text-sm text-muted-foreground">
                    Envie uma mensagem de modelo ("hello_world") para verificar sua configuração.
                </p>
                <Form {...testForm}>
                    <form onSubmit={testForm.handleSubmit(onTestSubmit)} className="flex flex-col sm:flex-row sm:items-end gap-4">
                        <FormField
                            control={testForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel>Número de Destino</FormLabel>
                                    <FormControl>
                                        <Input placeholder="5511999998888" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={testForm.formState.isSubmitting} className="w-full sm:w-auto">
                            {testForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Teste
                        </Button>
                    </form>
                </Form>
            </div>
        </>
    );
}

function GoogleAnalyticsSettingsForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const form = useForm<GoogleAnalyticsFormValues>({
        resolver: zodResolver(googleAnalyticsFormSchema),
        defaultValues: { ga4PropertyId: '', ga4CredentialsJson: '' },
    });

    useEffect(() => {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                form.reset({
                    ga4PropertyId: data.ga4PropertyId || '',
                    ga4CredentialsJson: data.ga4CredentialsJson || '',
                });
                if (data.ga4CredentialsJson) {
                    try {
                        const credentials = JSON.parse(data.ga4CredentialsJson);
                        setFileName(`credenciais_${credentials.project_id}.json`);
                    } catch (e) {
                        setFileName('Arquivo de credenciais inválido');
                    }
                }
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [form]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                try {
                    JSON.parse(content);
                    form.setValue('ga4CredentialsJson', content, { shouldValidate: true });
                } catch (error) {
                    toast({ variant: 'destructive', title: 'Arquivo Inválido', description: 'O arquivo selecionado não é um JSON válido.' });
                    setFileName(null);
                    form.setValue('ga4CredentialsJson', '');
                }
            };
            reader.readAsText(file);
        }
    };

    const onSubmit = async (data: GoogleAnalyticsFormValues) => {
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'siteConfig', 'main');
            await setDoc(settingsRef, data, { merge: true });
            toast({
                title: 'Sucesso!',
                description: 'Suas configurações do Google Analytics foram salvas.',
            });
        } catch (error) {
            console.error('Error updating GA settings:', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar as configurações.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
      return (
        <div className="space-y-8">
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
      );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="ga4PropertyId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ID da Propriedade do Google Analytics 4</FormLabel>
                            <FormControl><Input placeholder="Ex: 123456789" {...field} /></FormControl>
                            <FormDescription>Encontrado nos detalhes da sua propriedade no Google Analytics.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="ga4CredentialsJson"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Arquivo de Credenciais JSON</FormLabel>
                            <FormControl>
                                 <div className="flex items-center gap-4">
                                    <Input id="json-upload" type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                                    <Label htmlFor="json-upload" className="flex-grow">
                                        <Button type="button" variant="outline" className="w-full justify-start" asChild>
                                            <span className='w-full'>
                                                <FileUp className="mr-2 h-4 w-4" />
                                                {fileName || 'Selecionar arquivo credentials.json'}
                                            </span>
                                        </Button>
                                    </Label>
                                </div>
                            </FormControl>
                            <FormDescription>
                                Faça o download do arquivo JSON da sua conta de serviço no Google Cloud Console.
                                <a href="https://cloud.google.com/iam/docs/service-accounts-create" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">Saiba mais</a>.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isSaving}>
                    {isSaving ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                    Salvar Configurações do Analytics
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stripe">
            <KeyRound className="mr-2 h-4 w-4" /> Stripe
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageSquare className="mr-2 h-4 w-4" /> Suporte WhatsApp
          </TabsTrigger>
          <TabsTrigger value="whatsapp-api">
            <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp (API)
          </TabsTrigger>
           <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" /> E-mail
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="mr-2 h-4 w-4" /> Analytics
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
        <TabsContent value="whatsapp-api">
          <Card>
              <CardHeader>
                  <CardTitle>Configuração do WhatsApp Business API</CardTitle>
                  <CardDescription>Conecte a API Oficial do WhatsApp para enviar notificações e mensagens ativas.</CardDescription>
              </CardHeader>
              <CardContent>
                  <WhatsAppApiSettingsForm />
              </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="email">
          <Card>
              <CardHeader>
                  <CardTitle>Configuração de Envio de E-mail (SMTP)</CardTitle>
                  <CardDescription>
                      Configure as credenciais do seu servidor de e-mail para que o sistema possa enviar notificações.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <EmailSettingsForm />
              </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics">
          <Card>
              <CardHeader>
                  <CardTitle>Configuração do Google Analytics</CardTitle>
                  <CardDescription>Conecte sua propriedade do GA4 para visualizar métricas no painel.</CardDescription>
              </CardHeader>
              <CardContent>
                  <GoogleAnalyticsSettingsForm />
              </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
