'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, orderBy, doc, updateDoc, writeBatch, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format } from 'date-fns';
import { ServiceOrder, ServiceOrderPriority, Client, Collaborator } from '@/types';
import { cn } from '@/lib/utils';
import { addDays, startOfDay, isAfter, isBefore } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Wrench, Filter, Eye, ChevronLeft, ChevronRight, AlertTriangle, LayoutTemplate, X, CalendarIcon, Paperclip, CheckCircle2, ArrowUp, ArrowDown, ChevronsUpDown, Minus, FileSignature, FileText, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const priorityMap: Record<ServiceOrderPriority, { label: string; icon: React.FC<any>; color: string }> = {
    baixa: { label: 'Baixa', icon: ArrowDown, color: 'text-gray-500' },
    media: { label: 'Média', icon: Minus, color: 'text-yellow-500' },
    alta: { label: 'Alta', icon: ArrowUp, color: 'text-red-500' },
};

const priorityOrder: Record<ServiceOrderPriority, number> = { alta: 3, media: 2, baixa: 1 };

export default function ServicosPage() {
  const { user, activeAccountId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  
  const [allServiceOrders, setAllServiceOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({ 
    status: '', 
    collaboratorId: '', 
    clientId: '',
    serviceType: '',
    dueInDays: '',
    showOverdue: false,
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
    if (!activeAccountId) return;
    setIsLoading(true);

    const q = query(
        collection(db, 'serviceOrders'),
        where('userId', '==', activeAccountId)
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
  }, [activeAccountId, toast]);

  // Fetch clients
  useEffect(() => {
    if (!activeAccountId) return;
    const clientsQuery = query(collection(db, 'customers'), where('userId', '==', activeAccountId), orderBy('name'));
    const unsubscribe = onSnapshot(clientsQuery, snapshot => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
    return unsubscribe;
  }, [activeAccountId]);

  // Fetch collaborators
  useEffect(() => {
      if (!activeAccountId) return;
      const collaboratorsQuery = query(collection(db, 'collaborators'), where('userId', '==', activeAccountId), orderBy('name', 'asc'));
      const unsubscribe = onSnapshot(collaboratorsQuery, snapshot => {
          setCollaborators(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator)));
      });
      return unsubscribe;
  }, [activeAccountId]);


  const handleBulkStatusChange = async (newStatus: string) => {
    // ... (implementation unchanged)
  };

  const handleBulkPriorityChange = async (newPriority: ServiceOrderPriority) => {
    // ... (implementation unchanged)
  };

  const handlePriorityChange = async (orderId: string, newPriority: ServiceOrderPriority) => {
    // ... (implementation unchanged)
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
    const unsortedOrders = Array.from(ordersByOriginalId.values());
    // Ordena as O.S. pela data de criação, da mais nova para a mais antiga, no lado do cliente.
    unsortedOrders.sort((a, b) => {
      if (!b.creationDate) return -1;
      if (!a.creationDate) return 1;
      return b.creationDate.toDate().getTime() - a.creationDate.toDate().getTime();
    });
    return unsortedOrders;
  }, [allServiceOrders]);

  const sortedAndFilteredOrders = useMemo(() => {
    let sortableItems = [...latestServiceOrders];

    sortableItems = sortableItems.filter(order => {
        const statusMatch = filters.status ? order.status === filters.status : true;
        const serviceTypeMatch = filters.serviceType ? order.serviceType === filters.serviceType : true;
        const collaboratorMatch = filters.collaboratorId ? order.collaboratorId === filters.collaboratorId : true;
        const clientMatch = filters.clientId ? order.clientId === filters.clientId : true;
        
        const hasUpcomingFilter = filters.dueInDays.trim() !== '' && !isNaN(parseInt(filters.dueInDays, 10));
        const hasOverdueFilter = filters.showOverdue;

        if (!hasUpcomingFilter && !hasOverdueFilter) {
            return statusMatch && serviceTypeMatch && collaboratorMatch && clientMatch;
        }

        if (!order.dueDate) {
            return false;
        }

        const dueDate = startOfDay(order.dueDate.toDate());
        const today = startOfDay(new Date());

        let matchesOverdue = false;
        if (hasOverdueFilter) {
            matchesOverdue = dueDate < today;
        }

        let matchesUpcoming = false;
        if (hasUpcomingFilter) {
            const days = parseInt(filters.dueInDays, 10);
            const targetDate = addDays(today, days);
            matchesUpcoming = dueDate >= today && dueDate <= targetDate;
        }
        
        const dateMatch = (hasOverdueFilter && matchesOverdue) || (hasUpcomingFilter && matchesUpcoming);

        return statusMatch && serviceTypeMatch && collaboratorMatch && clientMatch && dateMatch;
    });

    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'priority') {
                aValue = priorityOrder[a.priority || 'media'];
                bValue = priorityOrder[b.priority || 'media'];
            } else {
                 aValue = a[sortConfig.key as keyof ServiceOrder];
                 bValue = b[sortConfig.key as keyof ServiceOrder];
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
  
  const activeFilterBadges = useMemo(() => {
    return [
      filters.status && <Badge key="status" variant="secondary" className="gap-1">Status: {filters.status} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('status', '')}><X className="h-3 w-3"/></Button></Badge>,
      filters.clientId && <Badge key="client" variant="secondary" className="gap-1">Cliente: {clients.find(c => c.id === filters.clientId)?.name} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('clientId', '')}><X className="h-3 w-3"/></Button></Badge>,
      filters.collaboratorId && <Badge key="collab" variant="secondary" className="gap-1">Colaborador: {collaborators.find(c => c.id === filters.collaboratorId)?.name} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('collaboratorId', '')}><X className="h-3 w-3"/></Button></Badge>,
      filters.serviceType && <Badge key="type" variant="secondary" className="gap-1">Tipo: {filters.serviceType} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('serviceType', '')}><X className="h-3 w-3"/></Button></Badge>,
      filters.dueInDays && <Badge key="due" variant="secondary" className="gap-1">Vence em até {filters.dueInDays} dias <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('dueInDays', '')}><X className="h-3 w-3"/></Button></Badge>,
      filters.showOverdue && <Badge key="overdue" variant="secondary" className="gap-1">Mostrando vencidos <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('showOverdue', false)}><X className="h-3 w-3"/></Button></Badge>,
    ].filter(Boolean);
  }, [filters, clients, collaborators, handleFilterChange]);

  const numSelected = Object.values(selectedRows).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Ordens de Serviço
                </CardTitle>
                <CardDescription>
                    Visualize e gerencie todas as ordens de serviço em um único lugar.
                </CardDescription>
            </CardHeader>
        </Card>
       <Card>
          <CardHeader>
            <CardTitle><span className="flex items-center gap-2"><Filter className="h-5 w-5"/>Filtro de serviços</span></CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="grid gap-2">
                <Label>Filtrar por Cliente</Label>
                <SearchableSelect
                  value={filters.clientId}
                  onValueChange={value => handleFilterChange('clientId', value)}
                  options={clients.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Selecione um cliente..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Filtrar por Colaborador</Label>
                <SearchableSelect
                  value={filters.collaboratorId}
                  onValueChange={value => handleFilterChange('collaboratorId', value)}
                  options={collaborators.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Selecione um colaborador..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Filtrar por Status</Label>
                 <Select value={filters.status} onValueChange={value => handleFilterChange('status', value === 'all' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Todos os Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      {settings.serviceStatuses?.map(status => (
                        <SelectItem key={status.id} value={status.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: `hsl(${status.color})`}}></div>
                            <span>{status.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Filtrar por Tipo de Serviço</Label>
                 <Select value={filters.serviceType} onValueChange={value => handleFilterChange('serviceType', value === 'all' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      {settings.serviceTypes?.map(type => (
                        <SelectItem key={type.id} value={type.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: `hsl(${type.color})`}}></div>
                            <span>{type.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Prazo</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    placeholder="Em dias..." 
                    value={filters.dueInDays} 
                    onChange={e => handleFilterChange('dueInDays', e.target.value)}
                    className="w-full"
                  />
                  <div className="flex items-center space-x-2 pl-2 border-l h-full">
                    <Checkbox
                      id="show-overdue"
                      checked={filters.showOverdue}
                      onCheckedChange={(checked) => handleFilterChange('showOverdue', !!checked)}
                    />
                    <Label htmlFor="show-overdue" className="font-normal cursor-pointer whitespace-nowrap">
                      Vencidos
                    </Label>
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>
        
        {activeFilterBadges.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filtros ativos:</span>
            {activeFilterBadges}
          </div>
        )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            {numSelected > 0 && (
                <DropdownMenu>
                   {/* Dropdown content here */}
                </DropdownMenu>
            )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : paginatedOrders.length === 0 ? (
            <div className="text-center py-10"><Wrench className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Nenhuma ordem de serviço encontrada.</h3><p className="text-sm text-muted-foreground">{activeFilterBadges.length > 0 ? "Tente um filtro diferente." : "Que tal criar a primeira?"}</p></div>
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
                    <TableHead className="max-w-sm">Serviço / Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Colaborador</TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => requestSort('dueDate')} >Vencimento</TableHead>
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
                    const getSourceIcon = () => {
                        if (order.source?.type === 'quote') return { icon: FileText, tooltip: 'Gerada por Orçamento' };
                        if (order.source?.type === 'agreement' || order.generatedByAgreementId) return { icon: FileSignature, tooltip: 'Gerada por Contrato' };
                        return null;
                    };
                    const sourceIcon = getSourceIcon();
                    return (
                        <TableRow key={order.id} data-state={selectedRows[order.id] && "selected"}>
                         <TableCell><Checkbox checked={!!selectedRows[order.id]} onCheckedChange={checked => setSelectedRows(prev => ({...prev, [order.id]: !!checked}))} /></TableCell>
                         <TableCell>
                            <div className="flex items-center gap-1">
                                {sourceIcon && (
                                    <TooltipProvider>
                                        <Tooltip><TooltipTrigger><sourceIcon.icon className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>{sourceIcon.tooltip}</p></TooltipContent></Tooltip>
                                    </TooltipProvider>
                                )}
                                <Link href={`/dashboard/servicos/${order.id}`} className="font-mono text-sm font-medium hover:underline">
                                    #{order.id.substring(0, 6).toUpperCase()} (v{order.version || 1})
                                </Link>
                            </div>
                         </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                                {hasPendencies && (<TooltipProvider><Tooltip><TooltipTrigger><AlertTriangle className="h-4 w-4 text-amber-500" /></TooltipTrigger><TooltipContent><p>Pendências: definir prazo e responsável.</p></TooltipContent></Tooltip></TooltipProvider>)}
                                {order.attachments && order.attachments.length > 0 && (<TooltipProvider><Tooltip><TooltipTrigger><Paperclip className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Esta OS possui anexos.</p></TooltipContent></Tooltip></TooltipProvider>)}
                                <div>
                                    <Link href={`/dashboard/servicos/${order.id}`} className="font-medium hover:underline">{order.serviceType}</Link>
                                    <p className="text-xs text-muted-foreground line-clamp-1" title={order.problemDescription}>{order.problemDescription}</p>
                                    <div className="text-sm text-muted-foreground"><Link href={`/dashboard/base-de-clientes/${order.clientId}`} className="hover:underline">{order.clientName}</Link></div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{order.collaboratorId ? (<Link href={`/dashboard/colaboradores/${order.collaboratorId}`} className="hover:underline">{order.collaboratorName}</Link>) : ('Não definido')}</TableCell>
                        <TableCell className="hidden md:table-cell">{order.dueDate ? format(order.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                        <TableCell>
                            {priorityInfo ? (
                                <TooltipProvider>
                                    <Tooltip><TooltipTrigger><span className="sr-only">{priorityInfo.label}</span><priorityInfo.icon className={cn("h-5 w-5", priorityInfo.color)} /></TooltipTrigger><TooltipContent>Prioridade {priorityInfo.label}</TooltipContent></Tooltip>
                                </TooltipProvider>
                            ) : null}
                        </TableCell>
                        <TableCell><Badge style={{ backgroundColor: getStatusColor(order.status), color: 'hsl(var(--primary-foreground))' }} className="border-transparent whitespace-nowrap">{order.status}</Badge></TableCell>
                        <TableCell>
                            <DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/servicos/${order.id}`)}><Eye className="mr-2 h-4 w-4" /> Ver / Gerenciar</DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger><ChevronsUpDown className="mr-2 h-4 w-4"/>Alterar Prioridade</DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => handlePriorityChange(order.id, 'baixa')}>Baixa</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handlePriorityChange(order.id, 'media')}>Média</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handlePriorityChange(order.id, 'alta')}>Alta</DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
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

function SearchableSelect({ value, onValueChange, options, placeholder }: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const currentLabel = options.find(option => option.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal text-left">
          <span className="truncate">
            {currentLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Pesquisar..." />
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          <CommandList>
            <CommandGroup>
               <CommandItem key="all" value="all" onSelect={() => {
                    onValueChange('');
                    setOpen(false);
                  }}>
                    <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    Todos
                </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? '' : option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}