
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
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


export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    setIsLoading(true);
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
      toast({ variant: "destructive", title: "Erro ao carregar usuários" });
    });
    
    const unsubPlans = onSnapshot(plansQuery, (querySnapshot) => {
        const plansList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Plan));
        setPlans(plansList);
    }, (error) => {
        console.error("Error fetching plans: ", error);
        toast({ variant: "destructive", title: "Erro ao carregar planos" });
    });

    Promise.all([new Promise(res => onSnapshot(usersQuery, res)), new Promise(res => onSnapshot(plansQuery, res))])
        .finally(() => setIsLoading(false));

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
    setIsSubmitting(true);
    try {
      const result = await deleteUsers(selectedUids);
      if (result.success) {
        toast({ title: "Sucesso!", description: `${selectedUids.length} usuário(s) excluído(s).` });
        setIsBulkDeleteDialogOpen(false);
        setSelectedUids([]);
      } else {
        throw new Error(result.message || 'Falha ao excluir usuários.');
      }
    } catch (error: any) {
      console.error("Error bulk deleting users:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onBulkRoleSubmit = async (data: RoleFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateUsersRole(selectedUids, data.role);
      if (result.success) {
        toast({ title: "Sucesso!", description: `Permissão de ${selectedUids.length} usuário(s) atualizada.` });
        setIsBulkRoleDialogOpen(false);
        setSelectedUids([]);
      } else {
        throw new Error(result.message || 'Falha ao atualizar permissões.');
      }
    } catch (error: any) {
      console.error("Error bulk updating roles:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const onBulkPlanSubmit = async (data: PlanFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateUsersPlan(selectedUids, data.planId);
      if (result.success) {
        toast({ title: "Sucesso!", description: `Plano de ${selectedUids.length} usuário(s) atualizado.` });
        setIsBulkPlanDialogOpen(false);
        setSelectedUids([]);
      } else {
        throw new Error(result.message || 'Falha ao atualizar planos.');
      }
    } catch (error: any) {
      console.error("Error bulk updating plans:", error);
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSubmitting(false);
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
    if (user.subscriptionStatus === 'trialing') {
      return 'Em Teste';
    }
    if (!user.planId) {
      return 'Nenhum';
    }
    return plans.find(p => p.id === user.planId)?.name || 'Inválido';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Visualize e gerencie todos os usuários cadastrados no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
           {selectedUids.length > 0 && (
            <div className="flex items-center gap-4 bg-muted p-3 rounded-md mb-4">
              <p className="text-sm font-medium">{selectedUids.length} usuário(s) selecionado(s)</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="mr-2 h-4 w-4" />
                    Ações em Lote
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setIsBulkRoleDialogOpen(true)}>
                    <Shield className="mr-2 h-4 w-4" /> Alterar Permissão
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsBulkPlanDialogOpen(true)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Alterar Plano
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" /> Excluir Selecionados
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {isLoading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead padding="checkbox">
                    <Checkbox
                      checked={selectedUids.length === users.length && users.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                        <TableRow key={user.uid} data-state={selectedUids.includes(user.uid) && "selected"}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={selectedUids.includes(user.uid)}
                                    onCheckedChange={(checked) => handleSelectOne(user.uid, !!checked)}
                                    aria-label={`Selecionar usuário ${user.email}`}
                                />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="font-bold">{user.name || 'Usuário sem nome'}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell>{getUserPlanName(user)}</TableCell>
                            <TableCell>
                              <UserStatusBadge user={user} />
                            </TableCell>
                            <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                            </TableCell>
                            <TableCell>{user.createdAt ? format(user.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleOpenDialog(user, 'profile')}>
                                        <KeyRound className="mr-2 h-4 w-4" /> Editar Perfil
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenDialog(user, 'role')}>
                                        <Shield className="mr-2 h-4 w-4" /> Alterar Permissão
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleOpenDialog(user, 'plan')}>
                                        <CreditCard className="mr-2 h-4 w-4" /> Alterar Plano
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenDialog(user, 'impersonate')}>
                                        <UserCheck className="mr-2 h-4 w-4" /> Logar como Usuário
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled>
                                        <KeyRound className="mr-2 h-4 w-4" /> Resetar Senha
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            <strong>{selectedUids.length}</strong> de <strong>{users.length}</strong> usuário(s) selecionado(s).
          </div>
        </CardFooter>
      </Card>
      
      {/* Role Change Dialog (Single) */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Permissão de Usuário</DialogTitle>
              <DialogDescription>
                Alterando a permissão para <span className="font-bold">{selectedUser?.email}</span>.
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
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Plan Change Dialog (Single) */}
       <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Plano do Usuário</DialogTitle>
              <DialogDescription>
                Alterando o plano de <span className="font-bold">{selectedUser?.email}</span>. Esta ação substituirá qualquer assinatura ou teste existente.
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
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {plans.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPlanDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Impersonate Confirmation Dialog */}
       <Dialog open={isImpersonateDialogOpen} onOpenChange={setIsImpersonateDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Logar como {selectedUser?.displayName || 'Usuário'}</DialogTitle>
              <DialogDescription>
                Você tem certeza que deseja iniciar uma sessão como <span className="font-bold">{selectedUser?.email}</span>?
              </DialogDescription>
            </DialogHeader>
            <Alert variant="destructive">
                <Shield className="h-4 w-4" />
                <AlertTitle>Ação de Alto Risco</AlertTitle>
                <AlertDescription>
                    Esta ação lhe dará acesso total à conta do usuário. Todas as ações realizadas serão como se o próprio usuário as tivesse feito.
                </AlertDescription>
            </Alert>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsImpersonateDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button variant="destructive" onClick={handleImpersonate} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sim, logar como usuário
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil de Usuário</DialogTitle>
              <DialogDescription>
                Alterando dados de <span className="font-bold">{selectedUser?.email}</span>.
              </DialogDescription>
            </DialogHeader>
             <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 py-2">
                 <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input placeholder="Nome do usuário" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={profileForm.control}
                    name="companyName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Empresa (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
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
                        <FormControl><Input placeholder="(99) 99999-9999" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsProfileDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
       <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Usuários em Lote</DialogTitle>
              <DialogDescription>
                Você tem certeza que deseja excluir permanentemente <span className="font-bold">{selectedUids.length}</span> usuário(s)?
              </DialogDescription>
            </DialogHeader>
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ação Irreversível</AlertTitle>
                <AlertDescription>
                    Esta ação não pode ser desfeita. Todos os dados associados a estes usuários serão apagados.
                </AlertDescription>
            </Alert>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sim, excluir {selectedUids.length} usuários
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Role Change Dialog */}
      <Dialog open={isBulkRoleDialogOpen} onOpenChange={setIsBulkRoleDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Permissão em Lote</DialogTitle>
              <DialogDescription>
                Selecione a nova permissão para os <span className="font-bold">{selectedUids.length}</span> usuário(s) selecionados.
              </DialogDescription>
            </DialogHeader>
            <Form {...roleForm}>
              <form onSubmit={roleForm.handleSubmit(onBulkRoleSubmit)} className="space-y-4 py-2">
                 <FormField
                    control={roleForm.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nova Permissão</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma permissão" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsBulkRoleDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Aplicar a Todos
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Plan Change Dialog */}
      <Dialog open={isBulkPlanDialogOpen} onOpenChange={setIsBulkPlanDialogOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Plano em Lote</DialogTitle>
              <DialogDescription>
                Selecione o novo plano para os <span className="font-bold">{selectedUids.length}</span> usuário(s) selecionados.
              </DialogDescription>
            </DialogHeader>
            <Form {...planForm}>
              <form onSubmit={planForm.handleSubmit(onBulkPlanSubmit)} className="space-y-4 py-2">
                 <FormField
                    control={planForm.control}
                    name="planId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Novo Plano</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {plans.map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsBulkPlanDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Aplicar a Todos
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
