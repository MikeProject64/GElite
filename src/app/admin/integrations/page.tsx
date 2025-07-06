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
import { Loader2, Save, KeyRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const stripeFormSchema = z.object({
  stripePublishableKey: z.string().startsWith('pk_').optional().or(z.literal('')),
  stripeSecretKey: z.string().startsWith('sk_').optional().or(z.literal('')),
});

type StripeFormValues = z.infer<typeof stripeFormSchema>;

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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="stripePublishableKey"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chave Publicável do Stripe</FormLabel>
                            <FormControl><Input placeholder="pk_live_..." {...field} /></FormControl>
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
                            <FormControl><Input type="password" placeholder="sk_live_..." {...field} /></FormControl>
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
