

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format, isPast, isToday, differenceInDays, startOfWeek, endOfWeek, parseISO, differenceInCalendarDays, startOfDay, endOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dateFnsLocalizer, Event as BigCalendarEvent } from 'react-big-calendar';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Loader2, CalendarClock, Calendar as CalendarIcon, List, AlertTriangle, User, DollarSign, ArrowUp, ArrowDown, BarChartHorizontal, ChevronsUpDown, Minus } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ServiceOrder, ServiceOrderPriority } from '@/types';
import { cn } from '@/lib/utils';


// Dynamic import for the Calendar component
const BigCalendar = dynamic(
  () => import('react-big-calendar').then(mod => mod.Calendar),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);

const localizer = dateFnsLocalizer({
  format,
  parse: (str: string, format: any, locale: any) => parseISO(str),
  startOfWeek: (date: Date, options: any) => startOfWeek(date, options),
  getDay: (date: Date) => date.getDay(),
  locales: {
    'pt-BR': ptBR,
  },
});

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getDueDateStatus = (dueDate: Date) => {
    const today = startOfDay(new Date());
    const due = startOfDay(dueDate);

    if (isBefore(due, today)) {
        const daysAgo = differenceInDays(today, due);
        return { text: `Vencido há ${daysAgo} dia(s)`, variant: 'destructive' as const, color: 'hsl(var(--destructive))' };
    }
    if (isToday(due)) {
        return { text: 'Vence Hoje', variant: 'secondary' as const, className: 'text-amber-600 border-amber-600', color: 'hsl(48, 96%, 58%)' };
    }
    const daysUntilDue = differenceInDays(due, today);
    if (daysUntilDue <= 3) {
        return { text: `Vence em ${daysUntilDue} dia(s)`, variant: 'outline' as const, className: 'text-blue-600 border-blue-600', color: 'hsl(210, 70%, 60%)' };
    }
    return { text: `Vence em ${daysUntilDue} dias`, variant: 'outline' as const, color: 'hsl(var(--primary))' };
};


const getEventStyle = (event: BigCalendarEvent) => {
    const order = event.resource as ServiceOrder;
    if (order.status === 'Concluída' || order.status === 'Cancelada') {
        return { style: { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' } };
    }
    const { color } = getDueDateStatus(order.dueDate.toDate());
    return { style: { backgroundColor: color, color: 'white', border: 'none', borderRadius: '4px' } };
};

const CalendarTooltip: React.FC<{ event: BigCalendarEvent }> = ({ event }) => {
    const order = event.resource as ServiceOrder;
    return (
        <div className="p-2 bg-background shadow-lg rounded-md border text-sm max-w-xs">
            <p className="font-bold mb-1">{order.serviceType}</p>
            <p className="text-xs text-muted-foreground">OS #{order.id.substring(0, 6).toUpperCase()}</p>
            <div className="mt-2 space-y-1">
                 <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /><span>{order.clientName}</span></div>
                 <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /><span>{order.collaboratorName}</span></div>
                 <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" /><span>{formatCurrency(order.totalValue)}</span></div>
            </div>
        </div>
    );
};

const CalendarLegend: React.FC = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs mb-4">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-destructive"></div><span>Vencido</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[hsl(48,96%,58%)]"></div><span>Vence Hoje</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[hsl(210,70%,60%)]"></div><span>Vence em até 3 dias</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-primary"></div><span>A vencer</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-muted border"></div><span>Finalizado/Cancelado</span></div>
    </div>
);

const priorityMap: Record<ServiceOrderPriority, { label: string; icon: React.FC<any>; color: string }> = {
    baixa: { label: 'Baixa', icon: ArrowDown, color: 'text-gray-500' },
    media: { label: 'Média', icon: Minus, color: 'text-yellow-500' },
    alta: { label: 'Alta', icon: ArrowUp, color: 'text-red-500' },
};

export function DeadlinesClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { settings } = useSettings();
    const isMobile = useIsMobile();
    
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'thisWeek' | 'overdue'>('all');
    const [sortConfig, setSortConfig] = useState<{ key: keyof ServiceOrder | 'priority', direction: 'ascending' | 'descending' } | null>(null);

    useEffect(() => {
        const filterFromUrl = searchParams.get('filter');
        if (filterFromUrl && ['today', 'thisWeek', 'overdue'].includes(filterFromUrl)) {
            setActiveFilter(filterFromUrl as 'today' | 'thisWeek' | 'overdue');
        }
    }, [searchParams]);

    useEffect(() => {
        if (isMobile !== undefined) {
            setViewMode(isMobile ? 'list' : 'calendar');
        }
    }, [isMobile]);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        
        const q = query(
            collection(db, "serviceOrders"), 
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedOrders = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder))
                .filter(order => order.dueDate && !order.isTemplate)
                .sort((a,b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime());
            setOrders(fetchedOrders);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Error fetching deadlines: ", error);
            let description = "Não foi possível carregar os prazos. Verifique suas regras de segurança do Firestore.";
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                description = "A consulta ao banco de dados requer um índice. Por favor, clique no link no console de depuração do navegador para criá-lo.";
            }
            toast({ variant: "destructive", title: "Erro ao buscar dados", description: description });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast]);

    const activeOrders = useMemo(() => {
        const activeStatuses = settings.serviceStatuses?.filter(s => s !== 'Concluída' && s !== 'Cancelada') || ['Pendente', 'Em Andamento'];
        return orders.filter(order => activeStatuses.includes(order.status));
    }, [orders, settings.serviceStatuses]);

    const overdueCount = useMemo(() => {
        if (isLoading) return 0;
        return activeOrders.filter(o => isPast(o.dueDate.toDate()) && !isToday(o.dueDate.toDate())).length;
    }, [activeOrders, isLoading]);

    const requestSort = (key: keyof ServiceOrder | 'priority') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredOrders = useMemo(() => {
        let tempOrders = [...activeOrders];

        if (activeFilter === 'today') {
            tempOrders = tempOrders.filter(o => isToday(o.dueDate.toDate()));
        } else if (activeFilter === 'thisWeek') {
            const now = new Date();
            const start = startOfWeek(now, { locale: ptBR });
            const end = endOfWeek(now, { locale: ptBR });
            tempOrders = tempOrders.filter(o => {
                const dueDate = o.dueDate.toDate();
                return dueDate >= start && dueDate <= end;
            });
        } else if (activeFilter === 'overdue') {
            tempOrders = tempOrders.filter(o => isPast(o.dueDate.toDate()) && !isToday(o.dueDate.toDate()));
        }

        if (sortConfig !== null) {
            tempOrders.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof ServiceOrder];
                const bValue = b[sortConfig.key as keyof ServiceOrder];
                
                let comparison = 0;
                if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
                    comparison = aValue.toDate().getTime() - bValue.toDate().getTime();
                } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                }
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        
        return tempOrders;
    }, [activeOrders, activeFilter, sortConfig]);


    const calendarEvents = useMemo(() => orders.map(order => ({
        title: `${order.clientName} - ${order.serviceType}`,
        start: order.dueDate.toDate(),
        end: order.dueDate.toDate(),
        allDay: true,
        resource: order,
    })), [orders]);

    const handleRowClick = (orderId: string) => {
        router.push(`/dashboard/servicos/${orderId}`);
    };

    return (
      <TooltipProvider>
        <>
            {!isLoading && overdueCount > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção: Ordens de Serviço Vencidas!</AlertTitle>
                    <AlertDescription>
                        Você possui {overdueCount} ordem(ns) de serviço que ultrapassaram o prazo.{' '}
                        <button
                            onClick={() => setActiveFilter('overdue')}
                            className="font-bold underline hover:no-underline"
                        >
                            Clique aqui para visualizá-las.
                        </button>
                    </AlertDescription>
                </Alert>
            )}
            
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>Controle de Prazos</CardTitle>
                    <CardDescription>Visualize e gerencie os vencimentos das ordens de serviço.</CardDescription>
                  </div>
                   <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                                    <List className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Visualizar em Lista</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={viewMode === 'calendar' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('calendar')}>
                                    <CalendarIcon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Visualizar em Calendário</p></TooltipContent>
                        </Tooltip>
                   </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            {viewMode === 'list' && (
                                <div className="flex flex-wrap items-end gap-4 mb-4">
                                    <div>
                                        <Label className="text-sm font-medium">Filtrar por data</Label>
                                        <div className="flex gap-2 flex-wrap mt-2">
                                            <Button size="sm" variant={activeFilter === 'all' ? 'secondary' : 'outline'} onClick={() => setActiveFilter('all')}>Todos</Button>
                                            <Button size="sm" variant={activeFilter === 'overdue' ? 'secondary' : 'outline'} onClick={() => setActiveFilter('overdue')}>Vencidos</Button>
                                            <Button size="sm" variant={activeFilter === 'today' ? 'secondary' : 'outline'} onClick={() => setActiveFilter('today')}>Vencendo Hoje</Button>
                                            <Button size="sm" variant={activeFilter === 'thisWeek' ? 'secondary' : 'outline'} onClick={() => setActiveFilter('thisWeek')}>Esta Semana</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {viewMode === 'list' ? (
                                <>
                                    {sortedAndFilteredOrders.length === 0 ? (
                                        <div className="text-center py-10">
                                            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
                                            <h3 className="mt-4 text-lg font-semibold">Nenhuma ordem de serviço encontrada para este filtro.</h3>
                                            <p className="text-sm text-muted-foreground">Todos os prazos estão em dia!</p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className='cursor-pointer' onClick={() => requestSort('clientName')}>
                                                        <div className='flex items-center gap-2'>
                                                           Cliente {sortConfig?.key === 'clientName' && (sortConfig.direction === 'ascending' ? <ArrowUp className='h-4 w-4' /> : <ArrowDown className='h-4 w-4' />)}
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="hidden sm:table-cell">Serviço</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right cursor-pointer" onClick={() => requestSort('dueDate')}>
                                                        <div className='flex items-center justify-end gap-2'>
                                                            Vencimento {sortConfig?.key === 'dueDate' && (sortConfig.direction === 'ascending' ? <ArrowUp className='h-4 w-4' /> : <ArrowDown className='h-4 w-4' />)}
                                                        </div>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedAndFilteredOrders.map((order) => {
                                                    const dueDate = order.dueDate.toDate();
                                                    const statusInfo = getDueDateStatus(dueDate);
                                                    return (
                                                        <TableRow key={order.id} className="cursor-pointer" onClick={() => handleRowClick(order.id)}>
                                                            <TableCell className="font-medium">
                                                                <Link href={`/dashboard/base-de-clientes/${order.clientId}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                                                                    {order.clientName}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className="hidden sm:table-cell">
                                                                <Link href={`/dashboard/servicos/${order.id}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                                                                    {order.serviceType}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell><Badge variant={'outline'}>{order.status}</Badge></TableCell>
                                                            <TableCell className="text-right"><Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.text}</Badge></TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </>
                            ) : viewMode === 'calendar' ? (
                                <>
                                 <CalendarLegend />
                                <div className="h-[600px]">
                                    <BigCalendar
                                        localizer={localizer}
                                        events={calendarEvents}
                                        startAccessor="start"
                                        endAccessor="end"
                                        culture="pt-BR"
                                        messages={{
                                            next: "Próximo",
                                            previous: "Anterior",
                                            today: "Hoje",
                                            month: "Mês",
                                            week: "Semana",
                                            day: "Dia",
                                            agenda: "Agenda",
                                            date: "Data",
                                            time: "Hora",
                                            event: "Evento"
                                        }}
                                        eventPropGetter={getEventStyle}
                                        onSelectEvent={(event) => handleRowClick((event.resource as ServiceOrder).id)}
                                        components={{
                                            tooltip: CalendarTooltip,
                                        }}
                                    />
                                </div>
                                </>
                            ) : null }
                        </>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{sortedAndFilteredOrders.length}</strong> de <strong>{activeOrders.length}</strong> ordens de serviço ativas.
                    </div>
                </CardFooter>
            </Card>
        </>
      </TooltipProvider>
    );
}
