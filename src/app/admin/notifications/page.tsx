'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';

import type { AdminNotification, SystemUser } from '@/types';
import { sendNotification, updateNotification, deleteNotification } from './actions';
import { useAuth } from '@/components/auth-provider';


const notificationSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  message: z.string().min(1, 'A mensagem é obrigatória.'),
  target: z.enum(['all', 'specific'], { required_error: 'Selecione o público-alvo.'}),
  specificUsers: z.array(z.string()).optional(),
  actionUrl: z.string().url('Por favor, insira uma URL válida.').optional().or(z.literal('')),
  actionText: z.string().optional(),
}).refine(data => {
    if (data.target === 'specific') {
        return data.specificUsers && data.specificUsers.length > 0;
    }
    return true;
}, {
    message: 'Selecione ao menos um usuário.',
    path: ['specificUsers'],
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<AdminNotification | null>(null);
  const [deletingNotif, setDeletingNotif] = useState<AdminNotification | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<NotificationFormValues>({
      resolver: zodResolver(notificationSchema),
      defaultValues: {
          title: '',
          message: '',
          target: 'all',
          specificUsers: [],
          actionUrl: '',
          actionText: '',
      }
  });
  const watchTarget = form.watch('target');

  useEffect(() => {
    if (editingNotif) {
      form.reset({
        title: editingNotif.title,
        message: editingNotif.message,
        target: editingNotif.target,
        specificUsers: editingNotif.target === 'specific' ? editingNotif.sentTo : [],
        actionUrl: editingNotif.actionUrl || '',
        actionText: editingNotif.actionText || '',
      });
    } else {
      form.reset({
          title: '',
          message: '',
          target: 'all',
          specificUsers: [],
          actionUrl: '',
          actionText: '',
      });
    }
  }, [editingNotif, form]);

  useEffect(() => {
    setIsLoading(true);
    const notificationsQuery = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AdminNotification));
      setNotifications(notificationsList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setIsLoading(false);
    });

    const usersQuery = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as SystemUser));
        setUsers(usersList);
    });

    return () => {
      unsubscribe();
      unsubUsers();
    };
  }, []);
  
  const handleOpenDialog = (notif: AdminNotification | null = null) => {
    setEditingNotif(notif);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: NotificationFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: "Utilizador não autenticado. Por favor, faça login novamente.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
        const payload = {
            title: data.title,
            message: data.message,
            target: data.target,
            specificUsers: data.specificUsers,
            actionUrl: data.actionUrl,
            actionText: data.actionText,
        }
        
        let result;
        if (editingNotif) {
            const updateData = { title: data.title, message: data.message, actionUrl: data.actionUrl, actionText: data.actionText };
            result = await updateNotification(editingNotif.id, editingNotif.sentTo, updateData);
        } else {
            result = await sendNotification(payload);
        }

        if (result.success) {
            toast({
                title: "Sucesso!",
                description: result.message,
            });
            setIsDialogOpen(false);
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: editingNotif ? "Erro ao Atualizar" : "Erro ao Enviar",
            description: error.message || "Ocorreu um erro, tente novamente.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleDelete = async () => {
    if (!deletingNotif) return;
    
    const result = await deleteNotification(deletingNotif.id, deletingNotif.sentTo);
    
    if (result.success) {
      toast({ title: 'Sucesso', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    
    setDeletingNotif(null);
  };

  const userOptions = useMemo(() => {
    return users.map(user => ({
        value: user.uid,
        label: `${user.name} (${user.email})`,
    }));
  }, [users]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notificações do Sistema</CardTitle>
            <CardDescription>Envie, gerencie e visualize as notificações para seus usuários.</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Notificação
          </Button>
        </CardHeader>
        <CardContent>
          { isLoading ? (
             <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma notificação criada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notif) => (
                  <TableRow key={notif.id}>
                    <TableCell className="font-medium">{notif.title}</TableCell>
                    <TableCell className="capitalize">{notif.target === 'all' ? 'Todos' : `${notif.sentTo.length} Usuário(s)`}</TableCell>
                    <TableCell>
                        <Badge 
                            variant="default"
                            className={`capitalize ${notif.status === 'sent' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                        >
                            {notif.status}
                        </Badge>
                    </TableCell>
                    <TableCell>{notif.createdAt ? format(notif.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(notif)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingNotif(notif)} className="text-red-500">Apagar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{editingNotif ? 'Editar Notificação' : 'Criar Nova Notificação'}</DialogTitle>
            <DialogDescription>
              {editingNotif ? 'Altere os detalhes da notificação abaixo.' : 'Escreva e configure a notificação para seus usuários.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl><Input placeholder="Ex: Manutenção Programada" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensagem</FormLabel>
                  <FormControl><Textarea placeholder="Descreva a notificação em detalhes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="actionUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de Ação (Opcional)</FormLabel>
                    <FormControl><Input placeholder="https://exemplo.com/pagina" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="actionText" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do Botão (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ex: Ver Contrato" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <fieldset disabled={!!editingNotif}>
                <FormField control={form.control} name="target" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público-Alvo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos os Usuários</SelectItem>
                        <SelectItem value="specific">Usuários Específicos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {watchTarget === 'specific' && (
                  <FormField
                    control={form.control}
                    name="specificUsers"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Usuários</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={userOptions}
                            onChange={field.onChange}
                            value={field.value || []}
                            placeholder="Selecione os usuários"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </fieldset>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingNotif ? 'Salvar Alterações' : 'Enviar Agora'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingNotif} onOpenChange={(open) => !open && setDeletingNotif(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá apagar permanentemente a notificação para todos os usuários que a receberam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 