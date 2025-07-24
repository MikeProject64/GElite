
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package, Search, DollarSign, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '@/types';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

export function InventoryClient() {
  const { activeAccountId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!activeAccountId) return;
    setIsLoading(true);
    const q = query(collection(db, 'inventory'), where('userId', '==', activeAccountId), orderBy('name', 'asc'));

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
  }, [activeAccountId, toast]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return items;
    }
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const totalInventoryValue = useMemo(() => {
    return items.reduce((total, item) => total + (item.quantity * item.cost), 0);
  }, [items]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-3">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><DollarSign className='h-5 w-5'/> Valor Total em Estoque</CardTitle>
                  <CardDescription>Valor monetário total de todos os itens em seu inventário.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(totalInventoryValue)}</p>
              </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens em Estoque</CardTitle>
          <CardDescription>Visualize e gerencie as peças e produtos do seu negócio.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-4">
             <div className="relative flex-1">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map((item) => {
              const isLowStock = item.minStock !== undefined && item.quantity <= item.minStock;
              return (
                <Card key={item.id} className="flex flex-col cursor-pointer overflow-hidden group" onClick={() => router.push(`/dashboard/inventario/${item.id}`)}>
                    <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        {item.photoURL ? (
                            <Image src={item.photoURL} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                            <Package className="h-10 w-10 text-muted-foreground" />
                        )}
                        {isLowStock && <Badge variant="destructive" className="absolute top-2 right-2 gap-1.5"><AlertTriangle className="h-3 w-3" />Estoque Baixo</Badge>}
                    </div>
                    <CardHeader className="p-4">
                        <CardTitle className='truncate text-base'>{item.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-grow flex justify-between items-end">
                        <div>
                            <p className="text-xl font-bold">{item.quantity}</p>
                            <p className="text-xs text-muted-foreground">unidades</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">{formatCurrency(item.cost)}</p>
                            <p className="text-xs text-muted-foreground text-right">custo/un.</p>
                        </div>
                    </CardContent>
                </Card>
              );
            })}
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
    </div>
  );
}
