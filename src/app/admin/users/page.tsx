
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { SystemUser, Plan } from '@/types';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreHorizontal, Shield, KeyRound, UserCheck, CreditCard } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const roleFormSchema = z.object({
  role: z.enum(['user', 'admin'], { required_error: 'Por favor, selecione uma permissão.' }),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

const planFormSchema = z.object({
  planId: z.string({ required_error: 'Por favor, selecione um plano.' }),
});
type PlanFormValues = z.infer<typeof planFormSchema>;


export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  const roleForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
  });
  
  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
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
    }
  }, [selectedUser, roleForm, planForm]);

  const handleOpenDialog = (user: SystemUser, type: 'role' | 'plan') => {
    setSelectedUser(user);
    if(type === 'role') setIsRoleDialogOpen(true);
    if(type === 'plan') setIsPlanDialogOpen(true);
  };
  
  const onRoleSubmit = async (data: RoleFormValues) => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { role: data.role });
      toast({ title: "Sucesso!", description: `Permissão de ${selectedUser.email} atualizada para ${data.role}.` });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
       console.error("Error updating role: ", error);
       toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar a permissão.' });
    }
  }
  
  const onPlanSubmit = async (data: PlanFormValues) => {
    if (!selectedUser) return;
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
          {isLoading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                        <TableRow key={user.uid}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{getUserPlanName(user)}</TableCell>
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
                                    <DropdownMenuItem onClick={() => handleOpenDialog(user, 'role')}>
                                        <Shield className="mr-2 h-4 w-4" /> Alterar Permissão
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleOpenDialog(user, 'plan')}>
                                        <CreditCard className="mr-2 h-4 w-4" /> Alterar Plano
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled>
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
            Mostrando <strong>{users.length}</strong> usuário(s).
          </div>
        </CardFooter>
      </Card>
      
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
                    <Button type="button" variant="ghost" onClick={() => setIsRoleDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={roleForm.formState.isSubmitting}>
                        {roleForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
    </Dialog>
    
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
                    <Button type="button" variant="ghost" onClick={() => setIsPlanDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={planForm.formState.isSubmitting}>
                        {planForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
    </Dialog>
    </div>
  );
}
