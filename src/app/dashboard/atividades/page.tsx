
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collectionGroup, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format, formatDistanceToNow, startOfToday, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivityLogEntry } from '@/types';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Wrench, FileText, Filter, ChevronRight, ChevronLeft, CalendarIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type EnrichedActivity = ActivityLogEntry & {
  entityId: string;
  entityType: 'serviço' | 'orçamento' | 'cliente';
  entityCode?: string;
};

const getActivityIcon = (type: EnrichedActivity['entityType']) => {
    switch (type) {
        case 'cliente': return <User className="h-4 w-4 text-muted-foreground"/>;
        case 'serviço': return <Wrench className="h-4 w-4 text-muted-foreground"/>;
        case 'orçamento': return <FileText className="h-4 w-4 text-muted-foreground"/>;
        default: return null;
    }
};

const getActivityBadgeVariant = (type: EnrichedActivity['entityType']) => {
    switch (type) {
        case 'cliente': return 'secondary';
        case 'serviço': return 'default';
        case 'orçamento': return 'outline';
        default: return 'outline';
    }
}

const getActivityLink = (activity: EnrichedActivity) => {
    switch (activity.entityType) {
        case 'cliente': return `/dashboard/base-de-clientes/${activity.entityId}`;
        case 'serviço': return `/dashboard/servicos/${activity.entityId}`;
        case 'orçamento': return `/dashboard/orcamentos/${activity.entityId}`;
        default: return '#';
    }
};

export default function AtividadesPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [allActivities, setAllActivities] = useState<EnrichedActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: 'all' as 'all' | 'serviço' | 'orçamento' | 'cliente',
        dateRange: undefined as DateRange | undefined,
    });
    
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const activityQuery = query(
            collectionGroup(db, 'activityLog'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
            const enrichedActivities: EnrichedActivity[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as ActivityLogEntry;
                const pathSegments = doc.ref.path.split('/');
                const entityType = pathSegments[0]; // 'serviceOrders', 'quotes', 'customers'
                const entityId = pathSegments[1];

                let mappedType: EnrichedActivity['entityType'] | null = null;
                let entityCode = `#${entityId.substring(0, 6).toUpperCase()}`;

                if (entityType === 'serviceOrders') mappedType = 'serviço';
                if (entityType === 'quotes') mappedType = 'orçamento';
                if (entityType === 'customers') {
                    mappedType = 'cliente';
                    entityCode = data.entityName || 'Cliente'; // Assuming entityName is stored in log
                }
                
                if (mappedType) {
                    enrichedActivities.push({
                        ...data,
                        entityId: entityId,
                        entityType: mappedType,
                        entityCode: entityCode
                    });
                }
            });

            setAllActivities(enrichedActivities);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching activity log:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredActivities = useMemo(() => {
        return allActivities.filter(activity => {
            const typeMatch = filters.type === 'all' || activity.entityType === filters.type;
            let dateMatch = true;
            if (filters.dateRange) {
                const activityDate = activity.timestamp.toDate();
                if (filters.dateRange.from) dateMatch &&= (activityDate >= filters.dateRange.from);
                if (filters.dateRange.to) dateMatch &&= (activityDate <= filters.dateRange.to);
            }
            return typeMatch && dateMatch;
        });
    }, [allActivities, filters]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, itemsPerPage]);

    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
    const paginatedActivities = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredActivities.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredActivities, currentPage, itemsPerPage]);

    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
    const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Histórico de Atividades</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Atividade</CardTitle>
                    <CardDescription>Filtre o histórico de atividades por tipo ou período.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type-filter">Filtrar por Tipo</Label>
                            <Select value={filters.type} onValueChange={(value) => setFilters(f => ({...f, type: value as any}))}>
                                <SelectTrigger id="type-filter"><SelectValue placeholder="Todos os Tipos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Tipos</SelectItem>
                                    <SelectItem value="serviço">Serviços</SelectItem>
                                    <SelectItem value="orçamento">Orçamentos</SelectItem>
                                    <SelectItem value="cliente">Clientes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date-filter">Filtrar por Data</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="date-filter" variant="outline" className={cn("justify-start text-left font-normal", !filters.dateRange && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {filters.dateRange?.from ? (filters.dateRange.to ? (<>{format(filters.dateRange.from, "dd/MM/yy")} - {format(filters.dateRange.to, "dd/MM/yy")}</>) : (format(filters.dateRange.from, "dd/MM/yyyy"))) : (<span>Selecione um período</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <div className="flex flex-col sm:flex-row">
                                        <div className="flex flex-col gap-2 border-r border-border p-3">
                                            <Button variant="ghost" className="justify-start" onClick={() => setFilters(f => ({ ...f, dateRange: { from: startOfToday(), to: new Date() } }))}>Hoje</Button>
                                            <Button variant="ghost" className="justify-start" onClick={() => setFilters(f => ({ ...f, dateRange: { from: subDays(new Date(), 7), to: new Date() } }))}>Últimos 7 dias</Button>
                                            <Button variant="ghost" className="justify-start" onClick={() => setFilters(f => ({ ...f, dateRange: { from: startOfMonth(new Date()), to: new Date() } }))}>Este Mês</Button>
                                            <Button variant="destructive" className="justify-start" onClick={() => setFilters(f => ({ ...f, dateRange: undefined }))}>Limpar</Button>
                                        </div>
                                        <Calendar mode="range" selected={filters.dateRange} onSelect={(range) => setFilters(f => ({...f, dateRange: range}))} numberOfMonths={1} />
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Linha do Tempo Completa</CardTitle>
                    <CardDescription>Auditoria de todas as ações e alterações no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : paginatedActivities.length === 0 ? (
                        <div className="text-center py-10"><p className="text-muted-foreground">Nenhuma atividade encontrada para este filtro.</p></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Descrição da Atividade</TableHead>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead className="text-right">Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedActivities.map(activity => (
                                    <TableRow key={`${activity.entityId}-${activity.timestamp.toMillis()}`} className="cursor-pointer" onClick={() => router.push(getActivityLink(activity))}>
                                        <TableCell>
                                            <Badge variant={getActivityBadgeVariant(activity.entityType)} className="capitalize gap-1.5 pl-1.5">
                                                {getActivityIcon(activity.entityType)}
                                                {activity.entityType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{activity.description}</p>
                                            <p className="text-xs text-muted-foreground">{activity.entityCode}</p>
                                        </TableCell>
                                        <TableCell className='text-xs text-muted-foreground'>{activity.userEmail}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs">
                                            {formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true, locale: ptBR })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                 <CardFooter>
                    <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>Linhas por página:</span>
                            <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                                <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="15">15</SelectItem><SelectItem value="30">30</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <span>Página {currentPage} de {totalPages}</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading}><ChevronLeft className="h-4 w-4" />Anterior</Button>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages || isLoading}>Próximo<ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}

    