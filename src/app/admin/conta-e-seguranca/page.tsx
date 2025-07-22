'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

const activationEmailSchema = z.object({
  activationEmailSubject: z.string().min(3, 'Assunto obrigatório'),
  activationEmailBody: z.string().min(10, 'Corpo do e-mail obrigatório'),
});
type ActivationEmailValues = z.infer<typeof activationEmailSchema>;

export default function ContaESegurancaAdminPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ActivationEmailValues>({
    resolver: zodResolver(activationEmailSchema),
    defaultValues: {
      activationEmailSubject: 'Ative sua conta no Gestor Elite',
      activationEmailBody: 'Olá {NOME},<br><br>Para ativar seu e-mail, clique no link abaixo:<br><a href="{LINK}">{LINK}</a><br><br>Se não foi você, ignore esta mensagem.',
    },
  });

  useEffect(() => {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        form.reset({
          activationEmailSubject: data.activationEmailSubject || 'Ative sua conta no Gestor Elite',
          activationEmailBody: data.activationEmailBody || 'Olá {NOME},<br><br>Para ativar seu e-mail, clique no link abaixo:<br><a href="{LINK}">{LINK}</a><br><br>Se não foi você, ignore esta mensagem.',
        });
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [form]);

  const onSubmit = async (data: ActivationEmailValues) => {
    setIsSaving(true);
    try {
      const settingsRef = doc(db, 'siteConfig', 'main');
      await setDoc(settingsRef, {
        activationEmailSubject: data.activationEmailSubject,
        activationEmailBody: data.activationEmailBody,
      }, { merge: true });
      toast({ title: 'Sucesso!', description: 'Modelo de e-mail salvo.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o modelo.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Modelo de E-mail de Ativação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="animate-spin h-6 w-6" /></div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="activationEmailSubject" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assunto do E-mail</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="activationEmailBody" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corpo do E-mail</FormLabel>
                    <FormControl><Textarea rows={8} {...field} /></FormControl>
                    <div className="text-xs text-muted-foreground mt-1">Use <code>{'{NOME}'}</code> para o nome do usuário e <code>{'{LINK}'}</code> para o link de ativação.</div>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                  Salvar Modelo
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 