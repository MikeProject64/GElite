import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const perfilSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  companyName: z.string().min(2, { message: 'O nome da empresa é obrigatório.' }),
  phone: z.string().refine(val => val.replace(/\D/g, '').length >= 10, { message: 'Telefone inválido.' }),
  cpfCnpj: z.string().optional(),
  endereco: z.string().optional(),
});

type PerfilFormValues = z.infer<typeof perfilSchema>;

export default function PerfilPage() {
  const { user, systemUser, loading } = useAuth();

  const form = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      name: '',
      companyName: '',
      phone: '',
      cpfCnpj: '',
      endereco: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (systemUser) {
      form.reset({
        name: systemUser.name || '',
        companyName: systemUser.companyName || '',
        phone: systemUser.phone || '',
        cpfCnpj: systemUser.cpfCnpj || '',
        endereco: systemUser.endereco || '',
      });
    }
  }, [systemUser]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3 mb-8" />
          <div className="bg-white dark:bg-card rounded-lg shadow p-6">
            <div className="h-6 bg-muted rounded w-1/4 mb-4" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-muted" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
            <div className="h-10 bg-muted rounded mt-4 w-32" />
          </div>
          <div className="bg-white dark:bg-card rounded-lg shadow p-6">
            <div className="h-6 bg-muted rounded w-1/4 mb-4" />
            <div className="h-10 bg-muted rounded mb-2 w-full" />
            <div className="h-10 bg-muted rounded mb-2 w-full" />
            <div className="h-10 bg-muted rounded mb-2 w-full" />
            <div className="h-10 bg-muted rounded mt-2 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>
      <div className="grid gap-8">
        {/* Card Informações do Perfil */}
        <div className="bg-white dark:bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Informações do Perfil</h2>
          {/* Foto de perfil e formulário de dados */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl font-bold">
              {systemUser?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <button className="text-primary underline">Alterar Foto</button>
          </div>
          <Form {...form}>
            <form className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone/WhatsApp</FormLabel>
                    <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cpfCnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ/CPF</FormLabel>
                    <FormControl><Input placeholder="CNPJ ou CPF" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endereco" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input placeholder="Endereço completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <button type="submit" className="btn btn-primary mt-4">Salvar Alterações</button>
            </form>
          </Form>
        </div>
        {/* Card Segurança da Conta (a ser implementado) */}
        <div className="bg-white dark:bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Segurança da Conta</h2>
          {/* ...restante da segurança... */}
        </div>
      </div>
    </div>
  );
} 