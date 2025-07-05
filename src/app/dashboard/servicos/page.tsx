
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, doc, updateDoc, getDocs, limit, startAfter, endBefore, limitToLast, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Wrench, Filter, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ServiceOrder } from '@/types';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Cancelada': return 'destructive';
    default:
        const hash = status.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        return (Math.abs(hash) % 2 === 0) ? 'secondary' : 'outline';
  }
};

const ITEMS_PER_PAGE = 10;

export default function ServicosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', managerName: '', clientName: '' });

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  
  const fetchServiceOrders = useCallback(async (direction: 'next' | 'prev' | 'first' = 'first') => {
      if (!user) return;
      setIsLoading(true);

      let q;
      const baseQuery = query(
          collection(db, 'serviceOrders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
      );

      if (direction === 'next' && lastDoc) {
          q = query(baseQuery, startAfter(lastDoc), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDoc) {
          q = query(baseQuery, endBefore(firstDoc), limitToLast(ITEMS_PER_PAGE));
      } else {
          q = query(baseQuery, limit(ITEMS_PER_PAGE));
      }

      try {
          const snapshot = await getDocs(q);
          const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
          
          if (!snapshot.empty) {
              setServiceOrders(newOrders);
              setFirstDoc(snapshot.docs[0]);
              setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
              
              if(direction === 'next') setPage(p => p + 1);
              if(direction === 'prev') setPage(p => p - 1);
              if(direction === 'first') setPage(1);

              const nextCheckQuery = query(baseQuery, startAfter(snapshot.docs[snapshot.docs.length - 1]), limit(1));
              const nextSnap = await getDocs(nextCheckQuery);
              setIsLastPage(nextSnap.empty);
          } else if(direction === 'next') {
              setIsLastPage(true);
          } else if (direction === 'prev' && snapshot.empty) {
             // Stay on page 1 if going back from page 2 leads to empty results
             setPage(1);
          }

      } catch (error) {
          console.error("Error fetching service orders: ", error);
          toast({
              variant: "destructive",
              title: "Erro ao buscar dados",
              description: "Não foi possível carregar as ordens de serviço.",
          });
      } finally {
          setIsLoading(false);
      }
  }, [user, toast, lastDoc, firstDoc]);
  
  useEffect(() => {
    if(user){
      fetchServiceOrders('first');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(order => {
        const statusMatch = filters.status ? order.status === filters.status : true;
        const managerMatch = filters.managerName ? (order.managerName || '').toLowerCase().includes(filters.managerName.toLowerCase()) : true;
        const clientMatch = filters.clientName ? order.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) : true;
        return statusMatch && managerMatch && clientMatch;
    });
  }, [serviceOrders, filters]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const openCancelDialog = (orderId: string) => {
    setCancellingOrderId(orderId);
    setIsAlertOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrderId) return;
    try {
      const orderRef = doc(db, 'serviceOrders', cancellingOrderId);
      await updateDoc(orderRef, { status: 'Cancelada', completedAt: null });
      toast({ title: 'Sucesso', description: 'Ordem de serviço cancelada.' });
      // Refetch current page to see update
      const updatedOrders = serviceOrders.map(o => o.id === cancellingOrderId ? {...o, status: 'Cancelada'} : o);
      setServiceOrders(updatedOrders);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível cancelar a ordem de serviço.' });
    } finally {
      setIsAlertOpen(false);
      setCancellingOrderId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Serviços</h1>
        <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/dashboard/servicos/criar">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Nova Ordem de Serviço
                </span>
            </Link>
        </Button>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>
                <span className="flex items-center gap-2">
                    <Filter className="h-5 w-5"/>
                    Filtros de Acompanhamento
                </span>
            </CardTitle>
             <CardDescription>Use os filtros abaixo para refinar a visualização das suas ordens de serviço.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client-filter">Filtrar por Cliente</Label>
                <Input id="client-filter" placeholder="Nome do cliente..." value={filters.clientName} onChange={e => handleFilterChange('clientName', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager-filter">Filtrar por Responsável</Label>
                <Input id="manager-filter" placeholder="Nome do responsável..." value={filters.managerName} onChange={e => handleFilterChange('managerName', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status-filter">Filtrar por Status</Label>
                 <Select value={filters.status} onValueChange={value => handleFilterChange('status', value === 'all' ? '' : value)}>
                    <SelectTrigger id="status-filter">
                        <SelectValue placeholder="Todos os Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        {settings.serviceStatuses?.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controle e Acompanhamento de Serviços</CardTitle>
          <CardDescription>Visualize e gerencie todas as ordens de serviço em um único lugar.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : serviceOrders.length === 0 ? (
            <div className="text-center py-10">
                <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma ordem de serviço encontrada.</h3>
                <p className="text-sm text-muted-foreground">Que tal criar a primeira?</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className='w-[100px]'>OS</TableHead>
                    <TableHead>Serviço / Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Responsável</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                     <TableCell>
                        <Link href={`/dashboard/servicos/${order.id}`} className="font-mono text-sm font-medium hover:underline">
                            #{order.id.substring(0, 6).toUpperCase()}
                        </Link>
                      </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/servicos/${order.id}`} className="font-medium hover:underline">{order.serviceType}</Link>
                        <div className="text-sm text-muted-foreground">
                            <Link href={`/dashboard/base-de-clientes/${order.clientId}`} className="hover:underline">{order.clientName}</Link>
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {order.managerId ? (
                            <Link href={`/dashboard/responsaveis/${order.managerId}`} className="hover:underline">{order.managerName}</Link>
                        ) : (
                            'Não definido'
                        )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{order.dueDate ? format(order.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
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
                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/servicos/${order.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver / Gerenciar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={() => openCancelDialog(order.id)}>
                               <Trash2 className="mr-2 h-4 w-4" /> Cancelar OS
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
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <span>Página {page}</span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchServiceOrders('prev')} disabled={page <= 1 || isLoading}>
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchServiceOrders('next')} disabled={isLastPage || isLoading}>
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </CardFooter>
      </Card>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação irá alterar o status da ordem de serviço para "Cancelada". Esta ação pode ser revertida manually.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancellingOrderId(null)}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive hover:bg-destructive/90">
                Sim, cancelar
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}

    