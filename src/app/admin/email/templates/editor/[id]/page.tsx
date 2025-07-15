'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Loader2, Save, Eye, ArrowLeft } from 'lucide-react';

const templateSchema = z.object({
  name: z.string().min(3, { message: 'O nome do modelo é obrigatório.' }),
  subject: z.string().min(5, { message: 'O assunto do email é obrigatório.' }),
  htmlContent: z.string().min(20, { message: 'O conteúdo HTML é obrigatório.' }),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const templateId = params.id === 'new' ? null : params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', subject: '', htmlContent: '' },
  });

  useEffect(() => {
    async function fetchTemplate() {
      if (templateId) {
        const docRef = doc(db, 'emailTemplates', templateId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          form.reset(docSnap.data() as TemplateFormValues);
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: 'Modelo não encontrado.' });
          router.push('/admin/email/templates');
        }
      }
      setIsLoading(false);
    }
    fetchTemplate();
  }, [templateId, form, router, toast]);

  const onSubmit = async (data: TemplateFormValues) => {
    setIsSaving(true);
    try {
      if (templateId) {
        // Atualiza um modelo existente
        const docRef = doc(db, 'emailTemplates', templateId);
        await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Modelo atualizado com sucesso!' });
      } else {
        // Cria um novo modelo
        const newDocRef = doc(collection(db, 'emailTemplates'));
        await setDoc(newDocRef, { ...data, id: newDocRef.id, createdAt: serverTimestamp() });
        toast({ title: 'Sucesso', description: 'Modelo criado com sucesso!' });
        router.push(`/admin/email/templates/editor/${newDocRef.id}`);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o modelo.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Modelo
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{templateId ? 'Editar Modelo' : 'Criar Novo Modelo'}</CardTitle>
            <CardDescription>
              Defina o nome, assunto e o conteúdo HTML do seu email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Modelo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Boas-vindas para novos clientes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto do Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Bem-vindo à nossa plataforma!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="htmlContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo HTML</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="<html>...</html>"
                      className="min-h-[400px] font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
} 