'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, PlusCircle, Trash, Edit, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ManageListDialog } from '@/components/admin/email/manage-list-dialog';

const listSchema = z.object({
  name: z.string().min(3, { message: 'O nome da lista é obrigatório.' }),
  description: z.string().optional(),
});

type ListFormValues = z.infer<typeof listSchema>;

interface EmailList {
  id: string;
  name: string;
  description?: string;
  emails: string[];
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

export default function EmailListsPage() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [managingListId, setManagingListId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ListFormValues>({
    resolver: zodResolver(listSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    const q = query(collection(db, 'emailLists'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailList));
      setLists(listsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching lists:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as listas.' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const onSubmit = async (data: ListFormValues) => {
    try {
      await addDoc(collection(db, 'emailLists'), {
        ...data,
        emails: [],
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Sucesso', description: 'Lista criada com sucesso!' });
      form.reset();
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar a lista.' });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'emailLists', deletingId));
      toast({ title: 'Sucesso', description: 'Lista excluída com sucesso!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir la lista.' });
    } finally {
      setIsAlertOpen(false);
      setDeletingId(null);
    }
  };
  
  const openManageDialog = (listId: string) => {
    setManagingListId(listId);
    setIsManageDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Listas de Email</h1>
            <p className="text-muted-foreground">
              Crie e gerencie listas de contatos para suas campanhas.
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Lista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Lista</DialogTitle>
                <DialogDescription>
                  Dê um nome e uma descrição para sua nova lista de emails.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Lista</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Clientes VIP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Lista para promoções especiais" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar Lista
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Listas</CardTitle>
            <CardDescription>Aqui estão suas listas de email salvas.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : lists.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contatos</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell className="font-medium">{list.name}</TableCell>
                      <TableCell>{(list.emails || []).length}</TableCell>
                      <TableCell>
                        {list.createdAt ? format(new Date(list.createdAt.seconds * 1000), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openManageDialog(list.id)}>
                              <Users className="mr-2 h-4 w-4" /> Gerenciar Contatos
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <Edit className="mr-2 h-4 w-4" /> Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDeletingId(list.id); setIsAlertOpen(true); }} className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma lista de email encontrada.</p>
                <p className="text-sm mt-2">Clique em &quot;Nova Lista&quot; para começar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a lista de email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageListDialog 
        listId={managingListId}
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
      />
    </>
  );
} 