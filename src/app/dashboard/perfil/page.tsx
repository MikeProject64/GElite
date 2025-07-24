
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { updateEmail, verifyBeforeUpdateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { storage, db, auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';

const perfilSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  companyName: z.string().optional(),
  phone: z.string().min(10, { message: 'O telefone deve ter pelo menos 10 dígitos.' }).refine(val => val.replace(/\D/g, '').length >= 10, { message: 'Telefone inválido.' }),
  cpfCnpj: z.string().min(11, { message: 'O CPF/CNPJ deve ter pelo menos 11 dígitos.' }),
  endereco: z.string().min(5, { message: 'O endereço deve ter pelo menos 5 caracteres.' }),
});

type PerfilFormValues = z.infer<typeof perfilSchema>;

export default function PerfilPage() {
  const { user, systemUser, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFields, setSavedFields] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [sendingVerification, setSendingVerification] = useState(false);

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
  }, [systemUser, form]);

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail || newEmail === user.email) return;
    setChangingEmail(true);
    try {
      if (user.emailVerified) {
        await verifyBeforeUpdateEmail(user, newEmail);
        toast({ title: 'Confirme no novo e-mail', description: 'Enviamos um link de confirmação para o novo e-mail.' });
      } else {
        await updateEmail(user, newEmail);
        await updateDoc(doc(db, 'users', user.uid), { email: newEmail });
        toast({ title: 'E-mail atualizado', description: 'Seu e-mail foi alterado com sucesso.' });
      }
      setNewEmail('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Não foi possível alterar o e-mail.' });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPassword || !newPassword || newPassword !== confirmNewPassword) return;
    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Não foi possível alterar a senha.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendActivationEmail = async () => {
    setSendingVerification(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/send-activation-email', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'E-mail enviado', description: 'Verifique sua caixa de entrada (e spam) para ativar seu e-mail.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: data.error || 'Não foi possível enviar o e-mail.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Não foi possível enviar o e-mail.' });
    } finally {
      setSendingVerification(false);
    }
  };

  const handlePerfilSubmit = async (values: PerfilFormValues) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: values.name,
        companyName: values.companyName,
        phone: values.phone,
        cpfCnpj: values.cpfCnpj,
        endereco: values.endereco,
      });
      setSavedFields(['name', 'companyName', 'phone', 'cpfCnpj', 'endereco']);
      toast({ title: 'Perfil atualizado', description: 'Suas informações foram salvas com sucesso.' });
      setTimeout(() => setSavedFields([]), 1500);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar as alterações.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/3 mb-8" />
          <div className="bg-white dark:bg-card rounded-lg shadow p-6">
            <div className="h-6 bg-muted rounded w-1/4 mb-4" />
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

  // Bloqueio visual se o e-mail não estiver verificado
  const [bloqueado, setBloqueado] = useState(user && !user.emailVerified);

  useEffect(() => {
    if (user && user.emailVerified) {
      setBloqueado(false);
    } else if (user && !user.emailVerified) {
      setBloqueado(true);
    }
  }, [user?.emailVerified]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>
      <div className="grid md:grid-cols-2 gap-8 w-full h-full">
        {/* Card de Informações do Perfil - SEMPRE VISÍVEL */}
        <div className="bg-white dark:bg-card rounded-lg shadow p-6 flex flex-col h-full w-full grow">
          <div className="absolute top-4 right-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Alterar tema">
                  {theme === 'light' ? <Sun className="h-5 w-5" /> : theme === 'dark' ? <Moon className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}><Sun className="mr-2 h-4 w-4" />Claro</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className="mr-2 h-4 w-4" />Escuro</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}><Monitor className="mr-2 h-4 w-4" />Sistema</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <h2 className="text-xl font-semibold mb-4">Informações do Perfil</h2>
          <Form {...form}>
            <form ref={formRef} className="space-y-4" onSubmit={form.handleSubmit(handlePerfilSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} aria-label="Nome" className={savedFields.includes('name') ? 'ring-2 ring-green-400' : ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa</FormLabel>
                    <FormControl>
                      <Input {...field} aria-label="Nome da Empresa" className={savedFields.includes('companyName') ? 'ring-2 ring-green-400' : ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone/WhatsApp</FormLabel>
                    <FormControl>
                      <Input {...field} aria-label="Telefone/WhatsApp" className={savedFields.includes('phone') ? 'ring-2 ring-green-400' : ''} />
                    </FormControl>
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
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input placeholder="Endereço completo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="mt-4" disabled={isSaving || !form.formState.isDirty} aria-label="Salvar Alterações">
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </Form>
        </div>

        {/* Card de Segurança da Conta - AQUI VAI O BLOQUEIO */}
        <div className="bg-white dark:bg-card rounded-lg shadow p-6 relative">
          {bloqueado && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg">
              <div className="text-center p-4">
                <h2 className="text-xl font-bold mb-2 text-primary">Ative seu e-mail</h2>
                <p className="mb-4 text-muted-foreground">
                  Você precisa verificar seu e-mail para acessar as opções de segurança.
                </p>
                <Button onClick={handleSendActivationEmail} disabled={sendingVerification}>
                  {sendingVerification ? 'Enviando...' : 'Reenviar e-mail de ativação'}
                </Button>
              </div>
            </div>
          )}
          <h2 className="text-xl font-semibold mb-6">Segurança da Conta</h2>
          <div className="space-y-6">

            {/* Seção de Verificação de E-mail */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status do E-mail</p>
                <p className={`text-sm ${user?.emailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                  {user?.emailVerified ? 'E-mail verificado' : 'E-mail não verificado'}
                </p>
              </div>
              {!user?.emailVerified && (
                <Button onClick={handleSendActivationEmail} disabled={sendingVerification} size="sm">
                  {sendingVerification ? 'Enviando...' : 'Verificar E-mail'}
                </Button>
              )}
            </div>

            {/* Seção Alterar E-mail */}
            <div className="border-t pt-6">
              <form onSubmit={handleChangeEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">E-mail atual</label>
                  <Input type="email" value={user?.email || ''} disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Novo e-mail</label>
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Digite o novo e-mail" required />
                </div>
                <Button type="submit" className="w-full" disabled={changingEmail || !newEmail || newEmail === user?.email}>
                  {changingEmail ? 'Enviando Link...' : 'Alterar E-mail'}
                </Button>
              </form>
            </div>

            {/* Seção Alterar Senha */}
            <div className="border-t pt-6">
              <form onSubmit={handleChangePassword} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Senha Atual</label>
                  <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nova Senha</label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirmar Nova Senha</label>
                  <Input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full" disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmNewPassword}>
                  {changingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

    