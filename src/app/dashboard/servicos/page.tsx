
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, doc, updateDoc, writeBatch, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format } from 'date-fns';
import { ServiceOrder, ServiceOrderPriority } from '@/types';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Wrench, Filter, Eye, ChevronLeft, ChevronRight, AlertTriangle, LayoutTemplate, X, CalendarIcon, Paperclip, CheckCircle2, ArrowUp, ArrowDown, ChevronsUpDown, Minus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const priorityMap: Record<ServiceOrderPriority, { label: string; icon: React.FC<any>; color: string }> = {
    baixa: { label: 'Baixa', icon: ArrowDown, color: 'text-gray-500' },
    media: { label: 'Média', icon: Minus, color: 'text-yellow-500' },
    alta: { label: 'Alta', icon: ArrowUp, color: 'text-red-500' },
};

const priorityOrder: Record<ServiceOrderPriority, number> = { alta: 3, media: 2, baixa: 1 };


export default function ServicosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  
  const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    status: '', 
    collaboratorName: '', 
    clientName: '',
    dueDate: undefined as DateRange | undefined,
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: keyof ServiceOrder | 'priority', direction: 'ascending' | 'descending' } | null>(null);

  const getStatusColor = (statusName: string) => {
    const status = settings.serviceStatuses?.find(s => s.name === statusName);
    return status ? `hsl(${status.color})` : 'hsl(var(--muted-foreground))';
  };

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

  const handleBulkStatusChange = async (newStatus: string) => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) return;

    const batch = writeBatch(db);
    selectedIds.forEach(id => {
        const orderRef = doc(db, 'serviceOrders', id);
        const updateData: any = { status: newStatus };
        if (newStatus === 'Concluída') updateData.completedAt = new Date();
        else updateData.completedAt = null;
        batch.update(orderRef, updateData);
    });

    try {
        await batch.commit();
        toast({ title: "Sucesso!", description: `${selectedIds.length} ordem(ns) de serviço atualizada(s).` });
        setSelectedRows({});
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar as ordens de serviço." });
    }
  };

  const handleBulkPriorityChange = async (newPriority: ServiceOrderPriority) => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) return;

    const batch = writeBatch(db);
    selectedIds.forEach(id => {
        const orderRef = doc(db, 'serviceOrders', id);
        batch.update(orderRef, { priority: newPriority });
    });

    try {
        await batch.commit();
        toast({ title: "Sucesso!", description: `Prioridade de ${selectedIds.length} ordem(ns) de serviço atualizada.` });
        setSelectedRows({});
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar as prioridades." });
    }
  };


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

  const sortedAndFilteredOrders = useMemo(() => {
    let sortableItems = [...latestServiceOrders];

    sortableItems = sortableItems.filter(order => {
        const statusMatch = filters.status ? order.status === filters.status : true;
        const collaboratorMatch = filters.collaboratorName ? (order.collaboratorName || '').toLowerCase().includes(filters.collaboratorName.toLowerCase()) : true;
        const clientMatch = filters.clientName ? order.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) : true;
        let dateMatch = true;
        if (filters.dueDate && order.dueDate) {
            const orderDueDate = order.dueDate.toDate();
            if (filters.dueDate.from) dateMatch &&= (orderDueDate >= filters.dueDate.from);
            if (filters.dueDate.to) dateMatch &&= (orderDueDate <= filters.dueDate.to);
        }
        return statusMatch && collaboratorMatch && clientMatch && dateMatch;
    });

    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'priority') {
                aValue = priorityOrder[a.priority || 'media'];
                bValue = priorityOrder[b.priority || 'media'];
            } else {
                 aValue = a[sortConfig.key];
                 bValue = b[sortConfig.key];
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }

    return sortableItems;
  }, [latestServiceOrders, filters, sortConfig]);
  
  const requestSort = (key: keyof ServiceOrder | 'priority') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows({});
  }, [filters, itemsPerPage, sortConfig]);

  const totalPages = Math.ceil(sortedAndFilteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAndFilteredOrders, currentPage, itemsPerPage]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const isAnyFilterActive = Object.values(filters).some(value => value !== '' && value !== undefined);

  const numSelected = Object.values(selectedRows).filter(Boolean).length;


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Serviços</h1>
        <div className='flex gap-2'>
             <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                <Link href="/dashboard/servicos/modelos">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Modelos</span>
                </Link>
            </Button>
            <Button size="sm" className="h-8 gap-1" asChild>
                <Link href="/dashboard/servicos/criar">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Nova Ordem de Serviço</span>
                </Link>
            </Button>
        </div>
      </div>

       <Card>
          <CardHeader>
            <CardTitle><span className="flex items-center gap-2"><Filter className="h-5 w-5"/>Filtros de Acompanhamento</span></CardTitle>
             <CardDescription>Use os filtros abaixo para refinar a visualização das suas ordens de serviço.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="grid gap-2"><Label htmlFor="client-filter">Filtrar por Cliente</Label><Input id="client-filter" placeholder="Nome do cliente..." value={filters.clientName} onChange={e => handleFilterChange('clientName', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="collaborator-filter">Filtrar por Colaborador</Label><Input id="collaborator-filter" placeholder="Nome do colaborador..." value={filters.collaboratorName} onChange={e => handleFilterChange('collaboratorName', e.target.value)} /></div>
              <div className="grid gap-2"><Label htmlFor="status-filter">Filtrar por Status</Label>
                 <Select value={filters.status} onValueChange={value => handleFilterChange('status', value === 'all' ? '' : value)}>
                    <SelectTrigger id="status-filter"><SelectValue placeholder="Todos os Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos os Status</SelectItem>{settings.serviceStatuses?.map(status => (<SelectItem key={status.id} value={status.name}>{status.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
               <div className="grid gap-2"><Label htmlFor="date-filter">Filtrar por Prazo</Label>
                <Popover>
                    <PopoverTrigger asChild><Button id="date-filter" variant="outline" className={cn("justify-start text-left font-normal", !filters.dueDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{filters.dueDate?.from ? (filters.dueDate.to ? (<>{format(filters.dueDate.from, "dd/MM/yy")} - {format(filters.dueDate.to, "dd/MM/yy")}</>) : (format(filters.dueDate.from, "dd/MM/yyyy"))) : (<span>Selecione um período</span>)}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={filters.dueDate} onSelect={(range) => handleFilterChange('dueDate', range)} numberOfMonths={2} /></PopoverContent>
                </Popover>
            </div>
          </CardContent>
        </Card>
        
        {isAnyFilterActive && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filtros ativos:</span>
            {filters.status && <Badge variant="secondary" className="gap-1">Status: {filters.status} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('status', '')}><X className="h-3 w-3"/></Button></Badge>}
            {filters.clientName && <Badge variant="secondary" className="gap-1">Cliente: {filters.clientName} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('clientName', '')}><X className="h-3 w-3"/></Button></Badge>}
            {filters.collaboratorName && <Badge variant="secondary" className="gap-1">Colaborador: {filters.collaboratorName} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('collaboratorName', '')}><X className="h-3 w-3"/></Button></Badge>}
            {filters.dueDate && <Badge variant="secondary" className="gap-1">Prazo <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('dueDate', undefined)}><X className="h-3 w-3"/></Button></Badge>}
          </div>
        )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Controle e Acompanhamento de Serviços</CardTitle>
              <CardDescription>Visualize e gerencie todas as ordens de serviço em um único lugar.</CardDescription>
            </div>
             {numSelected > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">Ações ({numSelected}) <MoreHorizontal className="ml-2 h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações em Massa</DropdownMenuLabel>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger><CheckCircle2 className="mr-2 h-4 w-4"/>Alterar Status</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                {settings.serviceStatuses?.map(status => (
                                    <DropdownMenuItem key={status.id} onClick={() => handleBulkStatusChange(status.name)}>{status.name}</DropdownMenuItem>
                                ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger><ChevronsUpDown className="mr-2 h-4 w-4"/>Alterar Prioridade</DropdownMenuSubTrigger>
                             <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleBulkPriorityChange('baixa')}>Baixa</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkPriorityChange('media')}>Média</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkPriorityChange('alta')}>Alta</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-10"><Wrench className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Nenhuma ordem de serviço encontrada.</h3><p className="text-sm text-muted-foreground">{isAnyFilterActive ? "Tente um filtro diferente." : "Que tal criar a primeira?"}</p></div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-12"><Checkbox onCheckedChange={(checked) => {
                        const newSelectedRows: Record<string, boolean> = {};
                        if(checked) { paginatedOrders.forEach(order => newSelectedRows[order.id] = true); }
                        setSelectedRows(newSelectedRows);
                    }}
                    checked={numSelected > 0 && numSelected === paginatedOrders.length}
                    indeterminate={numSelected > 0 && numSelected < paginatedOrders.length}
                    /></TableHead>
                    <TableHead className="w-24">OS (Versão)</TableHead>
                    <TableHead>Serviço / Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Colaborador</TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => requestSort('dueDate')} >Vencimento {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'ascending' ? <ArrowUp className="inline h-4 w-4" /> : <ArrowDown className="inline h-4 w-4" />)}</TableHead>
                    <TableHead className="w-24 cursor-pointer" onClick={() => requestSort('priority')}>
                        <div className="flex items-center gap-1">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span>Prioridade</span>
                        </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedOrders.map((order) => {
                    const hasPendencies = !order.collaboratorId && order.status === 'Pendente';
                    const priorityInfo = order.priority ? priorityMap[order.priority] : null;
                    return (
                        <TableRow key={order.id} data-state={selectedRows[order.id] && "selected"}>
                         <TableCell><Checkbox checked={!!selectedRows[order.id]} onCheckedChange={checked => setSelectedRows(prev => ({...prev, [order.id]: !!checked}))} /></TableCell>
                         <TableCell><Link href={`/dashboard/servicos/${order.id}`} className="font-mono text-sm font-medium hover:underline">#{order.id.substring(0, 6).toUpperCase()} (v{order.version || 1})</Link></TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                                {hasPendencies && (<TooltipProvider><Tooltip><TooltipTrigger><AlertTriangle className="h-4 w-4 text-amber-500" /></TooltipTrigger><TooltipContent><p>Pendências: definir prazo e responsável.</p></TooltipContent></Tooltip></TooltipProvider>)}
                                {order.attachments && order.attachments.length > 0 && (<TooltipProvider><Tooltip><TooltipTrigger><Paperclip className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Esta OS possui anexos.</p></TooltipContent></Tooltip></TooltipProvider>)}
                                <div><Link href={`/dashboard/servicos/${order.id}`} className="font-medium hover:underline">{order.serviceType}</Link><div className="text-sm text-muted-foreground"><Link href={`/dashboard/base-de-clientes/${order.clientId}`} className="hover:underline">{order.clientName}</Link></div></div>
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{order.collaboratorId ? (<Link href={`/dashboard/colaboradores/${order.collaboratorId}`} className="hover:underline">{order.collaboratorName}</Link>) : ('Não definido')}</TableCell>
                        <TableCell className="hidden md:table-cell">{order.dueDate ? format(order.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                        <TableCell>
                            {priorityInfo ? (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <span className="sr-only">{priorityInfo.label}</span>
                                            <priorityInfo.icon className={cn("h-5 w-5", priorityInfo.color)} />
                                        </TooltipTrigger>
                                        <TooltipContent>Prioridade {priorityInfo.label}</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : null}
                        </TableCell>
                        <TableCell><Badge style={{ backgroundColor: getStatusColor(order.status), color: 'hsl(var(--primary-foreground))' }} className="border-transparent">{order.status}</Badge></TableCell>
                        <TableCell>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end"><DropdownMenuLabel>Ações</DropdownMenuLabel><DropdownMenuItem onSelect={() => router.push(`/dashboard/servicos/${order.id}`)}><Eye className="mr-2 h-4 w-4" /> Ver / Gerenciar</DropdownMenuItem></DropdownMenuContent>
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
                <div className="flex-1">
                    {numSelected > 0 && `${numSelected} de ${sortedAndFilteredOrders.length} linha(s) selecionada(s).`}
                </div>
                <div className="flex items-center gap-2"><span>Linhas por página:</span><Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}><SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></div>
                <div className='flex-1 text-center'>Página {currentPage} de {totalPages}</div>
                <div className="flex flex-1 justify-end items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading}><ChevronLeft className="h-4 w-4" />Anterior</Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages || isLoading}>Próximo<ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
