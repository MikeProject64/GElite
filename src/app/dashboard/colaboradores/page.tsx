
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

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2, Briefcase, User, Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Collaborator } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

const collaboratorFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  type: z.enum(['collaborator', 'sector'], { required_error: 'Por favor, selecione um tipo.' }),
});

type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

export default function ColaboradoresPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingCollaboratorId, setDeletingCollaboratorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorFormSchema),
    defaultValues: { name: '', description: '', type: 'collaborator' },
  });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, 'collaborators'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const collaboratorList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Collaborator));
      setCollaborators(collaboratorList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching collaborators: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar os colaboradores.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  useEffect(() => {
    if (isDialogOpen) {
      if (editingCollaborator) {
        form.reset(editingCollaborator);
      } else {
        form.reset({ name: '', description: '', type: 'collaborator' });
      }
    }
  }, [isDialogOpen, editingCollaborator, form]);

  const filteredCollaborators = useMemo(() => {
    if (!searchTerm) return collaborators;
    return collaborators.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [collaborators, searchTerm]);

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
      setDeletingCollaboratorId(null);
      setIsAlertOpen(false);
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Falha ao excluir o item." });
    }
  };

  const onSubmit = async (data: CollaboratorFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    
    try {
      const payload = { ...data };
      if (editingCollaborator) {
        const collaboratorRef = doc(db, 'collaborators', editingCollaborator.id);
        await updateDoc(collaboratorRef, payload);
        toast({ title: "Sucesso!", description: "Colaborador atualizado." });
      } else {
        await addDoc(collection(db, 'collaborators'), {
          ...payload,
          userId: user.uid,
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
      <div className="flex items-center justify-between">
        <div >
         <h1 className="text-lg font-semibold md:text-2xl">Colaboradores e Setores</h1>
         <p className="text-sm text-muted-foreground">Gerencie as pessoas ou setores que podem ser atribuídos às ordens de serviço.</p>
        </div>
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
                    <FormControl><Textarea placeholder="Descreva brevemente a função ou o setor..." {...field} /></FormControl>
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
      ) : filteredCollaborators.length === 0 ? (
        <div className="text-center py-10">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum item encontrado.</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "Tente um termo de busca diferente." : "Comece adicionando seu primeiro colaborador ou setor."}
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCollaborators.map((c) => (
             <Card key={c.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <Link href={`/dashboard/colaboradores/${c.id}`} className='flex items-start gap-4'>
                    <Avatar className="h-12 w-12 border">
                        <AvatarImage src={c.photoURL} alt={c.name} />
                        <AvatarFallback>
                          {c.type === 'collaborator' ? <User className="h-6 w-6"/> : <Building2 className="h-6 w-6"/>}
                        </AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                        <CardTitle className="text-base">{c.name}</CardTitle>
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
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id)}>
                             <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description || 'Nenhuma descrição.'}</p>
                </CardContent>
                <CardFooter>
                   <Button variant="outline" size="sm" className='w-full' asChild>
                     <Link href={`/dashboard/colaboradores/${c.id}`}>Ver Serviços</Link>
                   </Button>
                </CardFooter>
            </Card>
          ))}
        </div>
      )}
       <CardFooter className='mt-4'>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredCollaborators.length}</strong> de <strong>{collaborators.length}</strong> itens.
          </div>
        </CardFooter>

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Sim, excluir
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
