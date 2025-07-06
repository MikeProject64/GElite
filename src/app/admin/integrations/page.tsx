
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
import { Loader2, Save, KeyRound, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { addTestCreditAction } from './actions';

const stripeFormSchema = z.object({
  stripePublishableKey: z.string().startsWith('pk_').optional().or(z.literal('')),
  stripeSecretKey: z.string().startsWith('sk_').optional().or(z.literal('')),
});

type StripeFormValues = z.infer<typeof stripeFormSchema>;

const testCreditFormSchema = z.object({
  amount: z.coerce.number().positive({ message: 'O valor deve ser maior que zero.' }),
});
type TestCreditFormValues = z.infer<typeof testCreditFormSchema>;


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

    const testCreditForm = useForm<TestCreditFormValues>({
        resolver: zodResolver(testCreditFormSchema),
        defaultValues: {
            amount: 100.00,
        },
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

    const onTestCreditSubmit = async (data: TestCreditFormValues) => {
        const result = await addTestCreditAction(data.amount);
        if (result.success) {
            toast({
                title: 'Ação de Teste Realizada!',
                description: result.message,
            });
             testCreditForm.reset();
        } else {
             toast({
                variant: 'destructive',
                title: 'Erro na Ação de Teste',
                description: result.message,
            });
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
                            Você está usando uma chave de teste. As ações abaixo são para fins de desenvolvimento e não afetarão seus dados reais.
                        </p>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Adicionar Crédito de Teste</CardTitle>
                                <CardDescription>Simule a adição de fundos a uma conta de teste para fins de desenvolvimento.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...testCreditForm}>
                                    <form onSubmit={testCreditForm.handleSubmit(onTestCreditSubmit)} className="flex flex-col sm:flex-row sm:items-end gap-4">
                                        <FormField
                                            control={testCreditForm.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem className="flex-grow">
                                                    <FormLabel>Valor (R$)</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input type="number" step="0.01" placeholder="100.00" className="pl-10" {...field} />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" disabled={testCreditForm.formState.isSubmitting} className="w-full sm:w-auto">
                                            {testCreditForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Creditar Valor
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </>
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
      </Tabs>
    </div>
  );
}
