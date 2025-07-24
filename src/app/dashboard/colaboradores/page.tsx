'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Users, KeyRound } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2, Briefcase, User, Building2 } from 'lucide-react';
import { Collaborator, ServiceOrder } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const collaboratorFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  type: z.enum(['collaborator', 'sector'], { required_error: 'Por favor, selecione um tipo.' }),
});

type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

export default function ColaboradoresPage() {
  const { user, activeAccountId } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingCollaboratorId, setDeletingCollaboratorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'collaborator' | 'sector'>('all');
  const pathname = usePathname();

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorFormSchema),
    defaultValues: { name: '', description: '', type: 'collaborator' },
  });

  useEffect(() => {
    if (!activeAccountId) return;
    setIsLoading(true);

    const qCollab = query(collection(db, 'collaborators'), where('userId', '==', activeAccountId), orderBy('createdAt', 'desc'));
    const unsubCollab = onSnapshot(qCollab, (snapshot) => {
      setCollaborators(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator)));
    });

    const activeStatuses = settings.serviceStatuses?.filter(s => s.name !== 'Concluída' && s.name !== 'Cancelada').map(s => s.name) || ['Pendente', 'Em Andamento'];
    const qOrders = query(collection(db, 'serviceOrders'), where('userId', '==', activeAccountId), where('status', 'in', activeStatuses.length > 0 ? activeStatuses : ['non-existent-status']));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setServiceOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)));
    });

    Promise.all([
      new Promise(resolve => onSnapshot(qCollab, () => resolve(true), () => resolve(null))),
      new Promise(resolve => onSnapshot(qOrders, () => resolve(true), () => resolve(null)))
    ]).then(() => setIsLoading(false));

    return () => {
      unsubCollab();
      unsubOrders();
    };
  }, [activeAccountId, settings.serviceStatuses]);
  
  const activeOrderCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    for (const order of serviceOrders) {
      if (order.collaboratorId) {
        counts[order.collaboratorId] = (counts[order.collaboratorId] || 0) + 1;
      }
    }
    return counts;
  }, [serviceOrders]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingCollaborator) {
        form.reset(editingCollaborator);
      } else {
        form.reset({ name: '', description: '', type: 'collaborator' });
      }
    }
  }, [isDialogOpen, editingCollaborator, form]);

  useEffect(() => {
    function abrirModal() {
      setEditingCollaborator(null);
      setIsDialogOpen(true); // Só abre o modal de cadastro de colaborador
    }
    window.addEventListener('abrir-modal-colaborador', abrirModal);
    return () => window.removeEventListener('abrir-modal-colaborador', abrirModal);
  }, []);

  const filteredCollaborators = useMemo(() => {
    return collaborators.filter(c => {
        const searchMatch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const typeMatch = typeFilter === 'all' || c.type === typeFilter;
        return searchMatch && typeMatch;
    });
  }, [collaborators, searchTerm, typeFilter]);

  const handleAddNew = () => {
    setEditingCollaborator(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator);
    setIsDialogOpen(true);
  };

  const handleDelete = (collaboratorId: string) => {
    setDeletingCollaboratorId(collaboratorId);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingCollaboratorId) return;
    try {
      await deleteDoc(doc(db, 'collaborators', deletingCollaboratorId));
      toast({ title: "Sucesso!", description: "Item excluído." });
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Falha ao excluir o item." });
    } finally {
      setDeletingCollaboratorId(null);
      setIsAlertOpen(false);
    }
  };

  const onSubmit = async (data: CollaboratorFormValues) => {
    if (!user || !activeAccountId) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    
    try {
      const payload = { ...data, description: data.description || '' };
      if (editingCollaborator) {
        const collaboratorRef = doc(db, 'collaborators', editingCollaborator.id);
        await updateDoc(collaboratorRef, payload);
        toast({ title: "Sucesso!", description: "Colaborador atualizado." });
      } else {
        await addDoc(collection(db, 'collaborators'), {
          ...payload,
          userId: activeAccountId,
          createdAt: Timestamp.now(),
        });
        toast({ title: "Sucesso!", description: "Colaborador adicionado." });
      }
      setIsDialogOpen(false);
      setEditingCollaborator(null);
    } catch (error) {
      console.error("Error adding/updating document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: `Falha ao salvar.`,
      });
    }
  };
  
  return (
    <div className="flex flex-col gap-4">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCollaborator ? "Editar" : "Adicionar Novo"}</DialogTitle>
              <DialogDescription>
                {editingCollaborator ? "Atualize os detalhes." : "Adicione um novo colaborador ou setor."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Tipo *</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="collaborator" /></FormControl>
                          <FormLabel className="font-normal">Colaborador</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="sector" /></FormControl>
                          <FormLabel className="font-normal">Setor</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Ex: João Silva ou Setor de Manutenção" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Textarea placeholder="Descreva brevemente a função ou o setor..." {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <DialogFooter className='pt-4'>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingCollaborator ? "Salvar Alterações" : "Salvar"}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      
      <div className="flex justify-between items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                id="search-item"
                placeholder="Buscar por nome..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={typeFilter === 'all' ? 'secondary' : 'outline'} onClick={() => setTypeFilter('all')}>Todos</Button>
            <Button size="sm" variant={typeFilter === 'collaborator' ? 'secondary' : 'outline'} onClick={() => setTypeFilter('collaborator')}>Colaboradores</Button>
            <Button size="sm" variant={typeFilter === 'sector' ? 'secondary' : 'outline'} onClick={() => setTypeFilter('sector')}>Setores</Button>
          </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCollaborators.length === 0 ? (
        <div className="text-center py-10">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum item encontrado.</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || typeFilter !== 'all' ? "Tente um filtro ou termo de busca diferente." : "Comece adicionando seu primeiro colaborador ou setor."}
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCollaborators.map((c) => {
            const activeCount = activeOrderCounts[c.id] || 0;
            return (
                <Card key={c.id} className="flex flex-col">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <Link href={`/dashboard/colaboradores/${c.id}`} className='flex items-start gap-4 flex-1 overflow-hidden'>
                        <Avatar className="h-12 w-12 border shrink-0">
                            <AvatarImage src={c.photoURL} alt={c.name} className="object-cover" />
                            <AvatarFallback>
                            {c.type === 'collaborator' ? <User className="h-6 w-6"/> : <Building2 className="h-6 w-6"/>}
                            </AvatarFallback>
                        </Avatar>
                        <div className='flex-1 overflow-hidden'>
                            <CardTitle className="text-base truncate">{c.name}</CardTitle>
                            <CardDescription className='capitalize text-xs'>{c.type === 'collaborator' ? 'Colaborador' : 'Setor'}</CardDescription>
                        </div>
                    </Link>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(c)}>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                        {activeCount > 0 && <Badge variant="secondary">Em Andamento: {activeCount}</Badge>}
                        <p className="text-sm text-muted-foreground line-clamp-2">{c.description || 'Nenhuma descrição.'}</p>
                    </CardContent>
                    <CardFooter>
                    <Button variant="outline" size="sm" className='w-full' asChild>
                        <Link href={`/dashboard/colaboradores/${c.id}`}>Ver Detalhes</Link>
                    </Button>
                    </CardFooter>
                </Card>
            )
          })}
        </div>
      )}
       
       <div className='mt-4 border-t pt-4'>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredCollaborators.length}</strong> de <strong>{collaborators.length}</strong> itens.
          </div>
        </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o item. Se ele estiver associado a ordens de serviço, o nome será mantido, mas o vínculo será perdido.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCollaboratorId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
                Sim, excluir
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
