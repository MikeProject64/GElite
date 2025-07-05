
'use client'

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format, isPast, isToday, differenceInDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dateFnsLocalizer, Event } from 'react-big-calendar';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Loader2, CalendarClock, Calendar as CalendarIcon, List } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';


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

interface ServiceOrder {
    id: string;
    clientName: string;
    serviceType: string;
    status: string;
    dueDate: Timestamp;
    userId: string;
    createdAt: Timestamp;
}

const localizer = dateFnsLocalizer({
  format,
  parse: (str: string, format: any, locale: any) => parseISO(str),
  startOfWeek: (date: Date, options: any) => startOfWeek(date, options),
  getDay: (date: Date) => date.getDay(),
  locales: {
    'pt-BR': ptBR,
  },
});

const getDueDateStatus = (dueDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { text: `Vencido há ${differenceInDays(new Date(), dueDate)} dia(s)`, variant: 'destructive' as const };
    }
    if (isToday(dueDate)) {
      return { text: 'Vence Hoje', variant: 'secondary' as const, className: 'text-amber-600 border-amber-600' };
    }
    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue < 0) { // Should be handled by isPast, but as a fallback
        return { text: `Vencido`, variant: 'destructive' as const };
    }
    if (daysUntilDue <= 3) {
      return { text: `Vence em ${daysUntilDue + 1} dia(s)`, variant: 'outline' as const, className: 'text-blue-600 border-blue-600' };
    }
    return { text: `Vence em ${daysUntilDue + 1} dias`, variant: 'outline' as const };
};

const getEventStyle = (event: Event) => {
    const order = event.resource as ServiceOrder;
    const dueDate = order.dueDate.toDate();
    let backgroundColor = 'hsl(var(--primary))';

    if (order.status === 'Concluída') backgroundColor = 'hsl(var(--accent))';
    if (order.status === 'Em Andamento') backgroundColor = 'hsl(210, 70%, 60%)';
    if (order.status === 'Aguardando Peça') backgroundColor = 'hsl(var(--secondary))';
    if (isPast(dueDate) && !isToday(dueDate)) backgroundColor = 'hsl(var(--destructive))';
    if (isToday(dueDate)) backgroundColor = 'hsl(48, 96%, 58%)';

    return { style: { backgroundColor, color: 'white', border: 'none', borderRadius: '4px' } };
};


export default function PrazosPage() {
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
            where("userId", "==", user.uid),
            orderBy("dueDate", "asc")
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const activeStatuses = settings.serviceStatuses?.filter(s => s !== 'Concluída' && s !== 'Cancelada') || ['Pendente', 'Em Andamento', 'Aguardando Peça'];
            const fetchedOrders = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder))
                .filter(order => activeStatuses.includes(order.status));
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
    }, [user, toast, settings.serviceStatuses]);

    const filteredOrders = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        if (activeFilter === 'all') return orders;
        if (activeFilter === 'today') return orders.filter(o => isToday(o.dueDate.toDate()));
        if (activeFilter === 'thisWeek') {
            const start = startOfWeek(now, { locale: ptBR });
            const end = endOfWeek(now, { locale: ptBR });
            return orders.filter(o => {
                const dueDate = o.dueDate.toDate();
                return dueDate >= start && dueDate <= end;
            });
        }
        if (activeFilter === 'overdue') {
            return orders.filter(o => {
                const dueDate = o.dueDate.toDate();
                dueDate.setHours(0,0,0,0);
                return dueDate < now && !isToday(dueDate);
            });
        }
        return orders;
    }, [orders, activeFilter]);


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
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Prazos de Entrega</h1>
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle>Controle de Prazos</CardTitle>
                    <CardDescription>Visualize e gerencie os vencimentos das ordens de serviço.</CardDescription>
                  </div>
                   <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                                        <List className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Visualizar em Lista</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant={viewMode === 'calendar' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('calendar')}>
                                        <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Visualizar em Calendário</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                   </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : viewMode === 'list' ? (
                        <>
                            <div className="flex gap-2 mb-4 flex-wrap">
                                <Button size="sm" variant={activeFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('all')}>Todos</Button>
                                <Button size="sm" variant={activeFilter === 'overdue' ? 'destructive' : 'ghost'} onClick={() => setActiveFilter('overdue')}>Vencidos</Button>
                                <Button size="sm" variant={activeFilter === 'today' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('today')}>Vencendo Hoje</Button>
                                <Button size="sm" variant={activeFilter === 'thisWeek' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('thisWeek')}>Esta Semana</Button>
                            </div>
                            {filteredOrders.length === 0 ? (
                                <div className="text-center py-10">
                                    <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-semibold">Nenhuma ordem de serviço encontrada para este filtro.</h3>
                                    <p className="text-sm text-muted-foreground">Todos os prazos estão em dia!</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead className="hidden sm:table-cell">Serviço</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Vencimento</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredOrders.map((order) => {
                                            const dueDate = order.dueDate.toDate();
                                            const statusInfo = getDueDateStatus(dueDate);
                                            return (
                                                <TableRow key={order.id} onClick={() => handleRowClick(order.id)} className="cursor-pointer">
                                                    <TableCell className="font-medium">{order.clientName}</TableCell>
                                                    <TableCell className="hidden sm:table-cell">{order.serviceType}</TableCell>
                                                    <TableCell><Badge variant={'outline'}>{order.status}</Badge></TableCell>
                                                    <TableCell className="text-right"><Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.text}</Badge></TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </>
                    ) : (
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
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{filteredOrders.length}</strong> de <strong>{orders.length}</strong> ordens de serviço ativas.
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

    
