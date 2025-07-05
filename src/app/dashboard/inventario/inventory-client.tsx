
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Package, Search, Trash2 } from 'lucide-react';
import { InventoryItem } from '@/types';


const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  quantity: z.coerce.number().min(0, { message: 'A quantidade inicial não pode ser negativa.' }),
  cost: z.coerce.number().min(0, { message: 'O custo não pode ser negativo.' }),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

export function InventoryClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { name: '', quantity: 0, cost: 0, },
  });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, 'inventory'), where('userId', '==', user.uid), orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));
      setItems(itemList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching inventory: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar o inventário.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  useEffect(() => {
    if (isDialogOpen) {
      form.reset({ name: '', quantity: 0, cost: 0 });
    }
  }, [isDialogOpen, form]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return items;
    }
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const handleDelete = (itemId: string) => {
    setDeletingItemId(itemId);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingItemId) return;
    try {
      await deleteDoc(doc(db, 'inventory', deletingItemId));
      toast({ title: "Sucesso!", description: "Item excluído." });
      setDeletingItemId(null);
      setIsAlertOpen(false);
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Falha ao excluir o item." });
    }
  };

  const onSubmit = async (data: ItemFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    
    try {
      const itemPayload = {
        name: data.name,
        quantity: data.quantity, // Initial quantity
        cost: data.cost,
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const itemRef = await addDoc(collection(db, 'inventory'), itemPayload);

      // Create the initial stock movement
      if (data.quantity > 0) {
          await addDoc(collection(db, 'inventoryMovements'), {
              itemId: itemRef.id,
              userId: user.uid,
              type: 'entrada',
              quantity: data.quantity,
              notes: 'Estoque inicial',
              createdAt: Timestamp.now(),
              attachments: []
          });
      }
      
      toast({ title: "Sucesso!", description: "Item adicionado ao inventário." });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: `Falha ao salvar o item.`
      });
    }
  };

  return (
    <>
      <div className="flex items-center justify-end -mt-12">
        <Button size="sm" className="h-8 gap-1" onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Adicionar Item
            </span>
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Item</DialogTitle>
              <DialogDescription>
                Preencha os detalhes para adicionar um novo item ao seu inventário.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Item *</FormLabel>
                    <FormControl><Input placeholder="Ex: Filtro de Ar" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade Inicial *</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="cost" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo por Unidade (R$) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <DialogFooter className='pt-4'>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Item
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Itens em Estoque</CardTitle>
          <CardDescription>Visualize e gerencie as peças e produtos do seu negócio.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
             <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-item"
                placeholder="Buscar por nome do item..."
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
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum item encontrado.</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "Tente um termo de busca diferente." : "Comece adicionando seu primeiro item."}
                </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Custo Unitário</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredItems.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/inventario/${item.id}`)}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(item.cost)}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id)}>
                               <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Item
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
            Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> itens.
          </div>
        </CardFooter>
      </Card>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o item e todo seu histórico de movimentações.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingItemId(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                    Sim, excluir
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
