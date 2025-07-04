
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2, Briefcase } from 'lucide-react';
import { Manager } from '@/types';

const managerFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
});

type ManagerFormValues = z.infer<typeof managerFormSchema>;

export default function ResponsaveisPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingManagerId, setDeletingManagerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<ManagerFormValues>({
    resolver: zodResolver(managerFormSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, 'managers'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const managerList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Manager));
      setManagers(managerList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching managers: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar os responsáveis.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  useEffect(() => {
    if (isDialogOpen) {
      if (editingManager) {
        form.reset(editingManager);
      } else {
        form.reset({ name: '' });
      }
    }
  }, [isDialogOpen, editingManager, form]);

  const filteredManagers = useMemo(() => {
    if (!searchTerm) return managers;
    return managers.filter(manager =>
      manager.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [managers, searchTerm]);

  const handleAddNew = () => {
    setEditingManager(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setIsDialogOpen(true);
  };

  const handleDelete = (managerId: string) => {
    setDeletingManagerId(managerId);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingManagerId) return;
    try {
      await deleteDoc(doc(db, 'managers', deletingManagerId));
      toast({ title: "Sucesso!", description: "Responsável/Setor excluído." });
      setDeletingManagerId(null);
      setIsAlertOpen(false);
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Falha ao excluir o responsável/setor." });
    }
  };

  const onSubmit = async (data: ManagerFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    
    try {
      if (editingManager) {
        const managerRef = doc(db, 'managers', editingManager.id);
        await updateDoc(managerRef, data);
        toast({ title: "Sucesso!", description: "Responsável/Setor atualizado." });
      } else {
        await addDoc(collection(db, 'managers'), {
          ...data,
          userId: user.uid,
          createdAt: Timestamp.now(),
        });
        toast({ title: "Sucesso!", description: "Responsável/Setor adicionado." });
      }
      setIsDialogOpen(false);
      setEditingManager(null);
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Responsáveis e Setores</h1>
        <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Adicionar Novo
            </span>
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingManager ? "Editar" : "Adicionar Novo"}</DialogTitle>
              <DialogDescription>
                {editingManager ? "Atualize o nome do responsável ou setor." : "Adicione um novo responsável ou setor."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Ex: João Silva ou Setor de Manutenção" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <DialogFooter className='pt-4'>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingManager ? "Salvar Alterações" : "Salvar"}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Gestão de Responsáveis</CardTitle>
          <CardDescription>Gerencie as pessoas ou setores que podem ser atribuídos às ordens de serviço.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
             <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-item"
                placeholder="Buscar por nome..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredManagers.length === 0 ? (
            <div className="text-center py-10">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum item encontrado.</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "Tente um termo de busca diferente." : "Comece adicionando seu primeiro responsável ou setor."}
                </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredManagers.map((manager) => (
                    <TableRow key={manager.id}>
                    <TableCell className="font-medium">{manager.name}</TableCell>
                    <TableCell>{manager.createdAt ? format(manager.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleEdit(manager)}>
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(manager.id)}>
                               <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredManagers.length}</strong> de <strong>{managers.length}</strong> itens.
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o item. Se ele estiver associado a ordens de serviço, o nome será mantido, mas o vínculo será perdido.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingManagerId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Sim, excluir
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
