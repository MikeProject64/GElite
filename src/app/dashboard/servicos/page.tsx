
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, doc, updateDoc, getDocs, onSnapshot } from 'firebase/firestore';
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Wrench, Filter, Eye, ChevronLeft, ChevronRight, AlertTriangle, LayoutTemplate } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const ITEMS_PER_PAGE = 15;

export default function ServicosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  
  const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', collaboratorName: '', clientName: '' });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const q = query(
        collection(db, 'serviceOrders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder))
            .filter(order => !order.isTemplate);
        
        setAllServiceOrders(orders);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching service orders: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar as ordens de serviço.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const latestServiceOrders = useMemo(() => {
    const ordersByOriginalId = new Map<string, ServiceOrder>();
    allServiceOrders.forEach(order => {
        const originalId = order.originalServiceOrderId || order.id;
        const existing = ordersByOriginalId.get(originalId);
        if (!existing || (order.version || 1) > (existing.version || 1)) {
            ordersByOriginalId.set(originalId, order);
        }
    });
    return Array.from(ordersByOriginalId.values());
  }, [allServiceOrders]);

  const filteredOrders = useMemo(() => {
    return latestServiceOrders.filter(order => {
        const statusMatch = filters.status ? order.status === filters.status : true;
        const collaboratorMatch = filters.collaboratorName ? (order.collaboratorName || '').toLowerCase().includes(filters.collaboratorName.toLowerCase()) : true;
        const clientMatch = filters.clientName ? order.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) : true;
        return statusMatch && collaboratorMatch && clientMatch;
    });
  }, [latestServiceOrders, filters]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Serviços</h1>
        <div className='flex gap-2'>
             <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                <Link href="/dashboard/servicos/modelos">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Modelos
                    </span>
                </Link>
            </Button>
            <Button size="sm" className="h-8 gap-1" asChild>
                <Link href="/dashboard/servicos/criar">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Nova Ordem de Serviço
                    </span>
                </Link>
            </Button>
        </div>
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
                <Label htmlFor="collaborator-filter">Filtrar por Colaborador</Label>
                <Input id="collaborator-filter" placeholder="Nome do colaborador..." value={filters.collaboratorName} onChange={e => handleFilterChange('collaboratorName', e.target.value)} />
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
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-10">
                <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma ordem de serviço encontrada.</h3>
                <p className="text-sm text-muted-foreground">{filters.status || filters.clientName || filters.collaboratorName ? "Tente um filtro diferente." : "Que tal criar a primeira?"}</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className='w-[100px]'>OS (Versão)</TableHead>
                    <TableHead>Serviço / Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Colaborador</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedOrders.map((order) => {
                    const hasPendencies = !order.collaboratorId && order.status === 'Pendente';
                    return (
                        <TableRow key={order.id}>
                         <TableCell>
                            <Link href={`/dashboard/servicos/${order.id}`} className="font-mono text-sm font-medium hover:underline">
                                #{order.id.substring(0, 6).toUpperCase()} (v{order.version || 1})
                            </Link>
                          </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                                {hasPendencies && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Pendências: definir prazo e responsável.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                <div>
                                    <Link href={`/dashboard/servicos/${order.id}`} className="font-medium hover:underline">{order.serviceType}</Link>
                                    <div className="text-sm text-muted-foreground">
                                        <Link href={`/dashboard/base-de-clientes/${order.clientId}`} className="hover:underline">{order.clientName}</Link>
                                    </div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {order.collaboratorId ? (
                                <Link href={`/dashboard/colaboradores/${order.collaboratorId}`} className="hover:underline">{order.collaboratorName}</Link>
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
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
         <CardFooter>
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <span>Página {currentPage} de {totalPages}</span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading}>
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages || isLoading}>
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
