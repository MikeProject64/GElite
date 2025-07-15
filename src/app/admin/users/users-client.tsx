'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, differenceInDays, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { SystemUser, Plan } from '@/types';

// Actions
import { createImpersonationToken, deleteUsers, updateUsersRole, updateUsersPlan } from './actions';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreHorizontal, Shield, KeyRound, UserCheck, CreditCard, Users, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

// Helper to convert ISO date strings from server component back to Firebase Timestamps
const processUser = (user: any): SystemUser => {
    return {
        ...user,
        createdAt: user.createdAt ? Timestamp.fromDate(new Date(user.createdAt)) : null,
        trialEndsAt: user.trialEndsAt ? Timestamp.fromDate(new Date(user.trialEndsAt)) : null,
    };
};

// Helper component for user status badge
const UserStatusBadge = ({ user }: { user: SystemUser }) => {
  const status = user.subscriptionStatus;
  const trialEndsAt = user.trialEndsAt?.toDate();
  
  if (status === 'trialing' && trialEndsAt) {
    const today = new Date();
    const daysRemaining = differenceInDays(trialEndsAt, today);
    const distance = formatDistanceToNowStrict(trialEndsAt, { locale: ptBR, addSuffix: true });

    if (daysRemaining < 0) {
      return <Badge variant="destructive">Teste Expirado</Badge>;
    }
    return <Badge variant="secondary">Em Teste ({distance})</Badge>;
  }
  
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600 text-white">Ativo</Badge>;
    case 'past_due':
      return <Badge variant="destructive">Pendente</Badge>;
    case 'canceled':
      return <Badge variant="outline">Cancelado</Badge>;
    case 'incomplete':
      return <Badge variant="secondary">Incompleto</Badge>;
    default:
      return <Badge variant="outline">N/A</Badge>;
  }
};


const roleFormSchema = z.object({
  role: z.enum(['user', 'admin'], { required_error: 'Por favor, selecione uma permissão.' }),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

const planFormSchema = z.object({
  planId: z.string({ required_error: 'Por favor, selecione um plano.' }),
});
type PlanFormValues = z.infer<typeof planFormSchema>;

const profileFormSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  companyName: z.string().optional(),
  phone: z.string().optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;


export default function UsersClientPage({ initialUsers, initialPlans }: { initialUsers: any[], initialPlans: Plan[] }) {
  const [users, setUsers] = useState<SystemUser[]>(() => initialUsers.map(processUser));
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [isLoading, setIsLoading] = useState(false); // Loading is now for real-time updates, not initial load
  const { toast } = useToast();

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isImpersonateDialogOpen, setIsImpersonateDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  
  // State for bulk action dialogs
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkRoleDialogOpen, setIsBulkRoleDialogOpen] = useState(false);
  const [isBulkPlanDialogOpen, setIsBulkPlanDialogOpen] = useState(false);

  const roleForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
  });
  
  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  useEffect(() => {
    // Initial data is passed as props. This effect now only listens for real-time updates.
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const plansQuery = query(collection(db, 'plans'), orderBy('monthlyPrice', 'asc'));

    const unsubUsers = onSnapshot(usersQuery, (querySnapshot) => {
      const usersList = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      } as SystemUser));
      setUsers(usersList);
    }, (error) => {
      console.error("Error fetching users: ", error);
      toast({ variant: "destructive", title: "Erro ao atualizar usuários em tempo real" });
    });
    
    const unsubPlans = onSnapshot(plansQuery, (querySnapshot) => {
        const plansList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Plan));
        setPlans(plansList);
    }, (error) => {
        console.error("Error fetching plans: ", error);
        toast({ variant: "destructive", title: "Erro ao atualizar planos em tempo real" });
    });

    return () => {
        unsubUsers();
        unsubPlans();
    };
  }, [toast]);

  useEffect(() => {
    if (selectedUser) {
      roleForm.setValue('role', selectedUser.role);
      planForm.setValue('planId', selectedUser.planId || '');
      profileForm.setValue('name', selectedUser.name || '');
      profileForm.setValue('companyName', selectedUser.companyName || '');
      profileForm.setValue('phone', selectedUser.phone || '');
    }
  }, [selectedUser, roleForm, planForm, profileForm]);

  const handleOpenDialog = (user: SystemUser, type: 'role' | 'plan' | 'impersonate' | 'profile') => {
    setSelectedUser(user);
    if(type === 'role') setIsRoleDialogOpen(true);
    if(type === 'plan') setIsPlanDialogOpen(true);
    if(type === 'impersonate') setIsImpersonateDialogOpen(true);
    if(type === 'profile') setIsProfileDialogOpen(true);
  };
  
  const onRoleSubmit = async (data: RoleFormValues) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { role: data.role });
      toast({ title: "Sucesso!", description: `Permissão de ${selectedUser.email} atualizada para ${data.role}.` });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
       console.error("Error updating role: ", error);
       toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar a permissão.' });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const onPlanSubmit = async (data: PlanFormValues) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
        const userRef = doc(db, 'users', selectedUser.uid);
        // Admin assignment grants active status and bypasses/removes Stripe subscription ID
        await updateDoc(userRef, { 
            planId: data.planId, 
            subscriptionId: null, 
            subscriptionStatus: 'active',
            trialStartedAt: null,
            trialEndsAt: null,
        });
        toast({ title: "Sucesso!", description: `Plano de ${selectedUser.email} atualizado.` });
        setIsPlanDialogOpen(false);
        setSelectedUser(null);
    } catch (error) {
         console.error("Error updating plan: ", error);
         toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o plano.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        name: data.name,
        companyName: data.companyName,
        phone: data.phone,
      });
      toast({ title: "Sucesso!", description: `Perfil de ${selectedUser.email} atualizado.` });
      setIsProfileDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating profile: ", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o perfil.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const result = await createImpersonationToken(selectedUser.uid);
      if (result.success && result.token) {
        // O ideal é ter uma página específica para autenticar com o token
        const loginUrl = `/login?impersonate_token=${result.token}`;
        window.open(loginUrl, '_blank');
        toast({ title: 'Sucesso!', description: `Abrindo uma nova aba para logar como ${selectedUser.email}.` });
        setIsImpersonateDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error(result.message || 'Falha ao gerar token de acesso.');
      }
    } catch (error: any) {
      console.error("Error impersonating user:", error);
      toast({ variant: 'destructive', title: 'Erro de Acesso', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUids.length === 0) return;
    setIsSubmitting(true);
    try {
        const result = await deleteUsers(selectedUids);
        if (result.success) {
            toast({ title: "Sucesso!", description: `${selectedUids.length} usuário(s) excluído(s).` });
            setSelectedUids([]);
        } else {
            throw new Error(result.message || 'Falha ao excluir usuários.');
        }
    } catch (error: any) {
        console.error("Error deleting users:", error);
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
        setIsSubmitting(false);
        setIsBulkDeleteDialogOpen(false);
    }
  };

  const onBulkRoleSubmit = async (data: RoleFormValues) => {
    if (selectedUids.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await updateUsersRole(selectedUids, data.role);
      if (result.success) {
        toast({ title: "Sucesso!", description: `Permissão de ${selectedUids.length} usuário(s) atualizada.` });
        setSelectedUids([]);
      } else {
        throw new Error(result.message || 'Falha ao atualizar permissões.');
      }
    } catch (error: any) {
      console.error("Error updating roles:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
      setIsBulkRoleDialogOpen(false);
    }
  };

  const onBulkPlanSubmit = async (data: PlanFormValues) => {
    if (selectedUids.length === 0) return;
    setIsSubmitting(true);
    try {
      const result = await updateUsersPlan(selectedUids, data.planId);
      if (result.success) {
        toast({ title: "Sucesso!", description: `Plano de ${selectedUids.length} usuário(s) atualizado.` });
        setSelectedUids([]);
      } else {
        throw new Error(result.message || 'Falha ao atualizar planos.');
      }
    } catch (error: any) {
      console.error("Error updating plans:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
      setIsBulkPlanDialogOpen(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUids(users.map(u => u.uid));
    } else {
      setSelectedUids([]);
    }
  };

  const handleSelectOne = (uid: string, checked: boolean) => {
    if (checked) {
      setSelectedUids(prev => [...prev, uid]);
    } else {
      setSelectedUids(prev => prev.filter(id => id !== uid));
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'default' : 'secondary';
  };
  
  const getUserPlanName = (user: SystemUser) => {
    if (!user.planId) return 'N/A';
    const plan = plans.find(p => p.id === user.planId);
    return plan ? plan.name : 'Plano Desconhecido';
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Usuários</CardTitle>
          <CardDescription>
            {users.length} usuário(s) no sistema. Use as ações em lote ou individuais para gerenciar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUids.length > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <div className="text-sm font-medium">{selectedUids.length} usuário(s) selecionado(s)</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsBulkRoleDialogOpen(true)}>Alterar Permissão</Button>
                <Button variant="outline" size="sm" onClick={() => setIsBulkPlanDialogOpen(true)}>Alterar Plano</Button>
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteDialogOpen(true)}>Excluir Selecionados</Button>
              </div>
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                        checked={selectedUids.length > 0 && selectedUids.length === users.length}
                        onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center">
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        </TableCell>
                    </TableRow>
                ) : users.map(user => (
                  <TableRow key={user.uid}>
                    <TableCell>
                        <Checkbox
                            checked={selectedUids.includes(user.uid)}
                            onCheckedChange={(checked) => handleSelectOne(user.uid, !!checked)}
                        />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{user.name || 'Nome não informado'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role === 'admin' ? <Shield className="h-3.5 w-3.5 mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                            {user.role === 'admin' ? 'Admin' : 'Usuário'}
                        </Badge>
                    </TableCell>
                    <TableCell><UserStatusBadge user={user} /></TableCell>
                    <TableCell>{getUserPlanName(user)}</TableCell>
                    <TableCell>
                        {user.createdAt ? format(user.createdAt.toDate(), "dd/MM/yyyy") : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenDialog(user, 'profile')}>Editar Perfil</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(user, 'role')}>Alterar Permissão</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(user, 'plan')}>Alterar Plano</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenDialog(user, 'impersonate')}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Logar como Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Total de <strong>{users.length}</strong> usuários.
          </div>
        </CardFooter>
      </Card>

        {/* Dialogs */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Alterar Permissão</DialogTitle>
                    <DialogDescription>
                        Alterando permissão para {selectedUser?.email}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...roleForm}>
                    <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-4">
                        <FormField
                            control={roleForm.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Permissão</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma permissão" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="user">Usuário</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsRoleDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Alterar Plano</DialogTitle>
                    <DialogDescription>
                        Alterando o plano para {selectedUser?.email}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...planForm}>
                    <form onSubmit={planForm.handleSubmit(onPlanSubmit)} className="space-y-4">
                        <FormField
                            control={planForm.control}
                            name="planId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plano</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um plano" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {plans.map(plan => (
                                                <SelectItem key={plan.id} value={plan.id}>{plan.name} - R${plan.monthlyPrice}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Alert>
                            <CreditCard className="h-4 w-4" />
                            <AlertTitle>Atenção</AlertTitle>
                            <AlertDescription>
                                Atribuir um plano manualmente remove qualquer assinatura existente do Stripe e concede acesso direto.
                            </AlertDescription>
                        </Alert>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsPlanDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

         <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Perfil</DialogTitle>
                    <DialogDescription>
                        Editando informações de {selectedUser?.email}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome do usuário" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={profileForm.control}
                            name="companyName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Empresa (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Empresa do usuário" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(99) 99999-9999" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsProfileDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={isImpersonateDialogOpen} onOpenChange={setIsImpersonateDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Logar como {selectedUser?.name || selectedUser?.email}?</DialogTitle>
                    <DialogDescription>
                        Isso abrirá uma nova aba e você será autenticado como este usuário,
                        permitindo que você veja o sistema da perspectiva dele.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsImpersonateDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleImpersonate} disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar e Logar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        {/* Bulk action dialogs */}
        <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmar Exclusão em Massa</DialogTitle>
                    <DialogDescription>
                        <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Ação Irreversível</AlertTitle>
                            <AlertDescription>
                                Você tem certeza que deseja excluir <strong>{selectedUids.length}</strong> usuário(s)? Esta ação não pode ser desfeita.
                            </AlertDescription>
                        </Alert>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsBulkDeleteDialogOpen(false)}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleBulkDelete} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sim, excluir {selectedUids.length} usuário(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isBulkRoleDialogOpen} onOpenChange={setIsBulkRoleDialogOpen}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Alterar Permissão em Massa</DialogTitle>
                    <DialogDescription>
                        Alterando permissão para {selectedUids.length} usuário(s).
                    </DialogDescription>
                </DialogHeader>
                <Form {...roleForm}>
                    <form onSubmit={roleForm.handleSubmit(onBulkRoleSubmit)} className="space-y-4">
                        <FormField
                            control={roleForm.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova Permissão</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma permissão" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="user">Usuário</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsBulkRoleDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar para {selectedUids.length} usuário(s)
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <Dialog open={isBulkPlanDialogOpen} onOpenChange={setIsBulkPlanDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Alterar Plano em Massa</DialogTitle>
                    <DialogDescription>
                        Alterando o plano para {selectedUids.length} usuário(s).
                    </DialogDescription>
                </DialogHeader>
                <Form {...planForm}>
                    <form onSubmit={planForm.handleSubmit(onBulkPlanSubmit)} className="space-y-4">
                        <FormField
                            control={planForm.control}
                            name="planId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Novo Plano</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um plano" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {plans.map(plan => (
                                                <SelectItem key={plan.id} value={plan.id}>{plan.name} - R${plan.monthlyPrice}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Alert>
                            <CreditCard className="h-4 w-4" />
                            <AlertTitle>Atenção</AlertTitle>
                            <AlertDescription>
                                Atribuir um plano manualmente remove quaisquer assinaturas existentes do Stripe e concede acesso direto.
                            </AlertDescription>
                        </Alert>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsBulkPlanDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar para {selectedUids.length} usuário(s)
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

    </div>
  );
} 