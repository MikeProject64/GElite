
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, Timestamp, limit, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RecentActivity, ServiceOrder, Quote, Customer } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Wrench, FileText, Filter, ChevronRight, ChevronLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';

const ITEMS_PER_PAGE = 15;

const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'cliente': return <Users className="h-4 w-4 text-muted-foreground"/>;
      case 'serviço': return <Wrench className="h-4 w-4 text-muted-foreground"/>;
      case 'orçamento': return <FileText className="h-4 w-4 text-muted-foreground"/>;
      default: return null;
    }
};

const getActivityBadgeVariant = (type: RecentActivity['type']) => {
    switch (type) {
        case 'cliente': return 'secondary';
        case 'serviço': return 'default';
        case 'orçamento': return 'outline';
        default: return 'outline';
    }
}

export default function AtividadesPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<'all' | 'serviço' | 'orçamento' | 'cliente'>('all');

    const fetchAllActivities = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            const queries = [
                query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('isTemplate', '==', false)),
                query(collection(db, 'customers'), where('userId', '==', user.uid)),
                query(collection(db, 'quotes'), where('userId', '==', user.uid), where('isTemplate', '==', false)),
            ];

            const [ordersSnap, customersSnap, quotesSnap] = await Promise.all([
                getDocs(queries[0]),
                getDocs(queries[1]),
                getDocs(queries[2]),
            ]);

            const ordersActivity: RecentActivity[] = ordersSnap.docs.map(doc => {
                const data = doc.data() as ServiceOrder;
                return { id: doc.id, type: 'serviço', description: `Nova OS: ${data.serviceType} para ${data.clientName}`, timestamp: data.createdAt.toDate(), href: `/dashboard/servicos/${doc.id}`};
            });
            const customersActivity: RecentActivity[] = customersSnap.docs.map(doc => {
                const data = doc.data() as Customer;
                return { id: doc.id, type: 'cliente', description: `Novo cliente: ${data.name}`, timestamp: data.createdAt.toDate(), href: `/dashboard/base-de-clientes/${doc.id}`};
            });
            const quotesActivity: RecentActivity[] = quotesSnap.docs.map(doc => {
                const data = doc.data() as Quote;
                return { id: doc.id, type: 'orçamento', description: `Orçamento para ${data.clientName}`, timestamp: data.createdAt.toDate(), href: `/dashboard/orcamentos/${doc.id}`};
            });
    
            const combined = [...ordersActivity, ...customersActivity, ...quotesActivity]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            
            setActivities(combined);

        } catch (error) {
            console.error("Error fetching all activities:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAllActivities();
    }, [fetchAllActivities]);

    const filteredActivities = useMemo(() => {
        if (typeFilter === 'all') {
            return activities;
        }
        return activities.filter(activity => activity.type === typeFilter);
    }, [activities, typeFilter]);

    // Pagination for filtered activities
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(filteredActivities.length / ITEMS_PER_PAGE);
    const paginatedActivities = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredActivities.slice(startIndex, endIndex);
    }, [filteredActivities, currentPage]);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Histórico de Atividades</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Atividade</CardTitle>
                    <CardDescription>Filtre o histórico de atividades por tipo de evento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type-filter">Filtrar por Tipo</Label>
                            <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value as any); setCurrentPage(1); }}>
                                <SelectTrigger id="type-filter">
                                    <SelectValue placeholder="Todos os Tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Tipos</SelectItem>
                                    <SelectItem value="serviço">Serviços</SelectItem>
                                    <SelectItem value="orçamento">Orçamentos</SelectItem>
                                    <SelectItem value="cliente">Clientes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Linha do Tempo Completa</CardTitle>
                    <CardDescription>Auditoria de todas as criações de registros no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : paginatedActivities.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">Nenhuma atividade encontrada para este filtro.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedActivities.map(activity => (
                                    <TableRow key={activity.id} className="cursor-pointer" onClick={() => router.push(activity.href)}>
                                        <TableCell>
                                            <Badge variant={getActivityBadgeVariant(activity.type)} className="capitalize gap-1.5 pl-1.5">
                                                {getActivityIcon(activity.type)}
                                                {activity.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{activity.description}</p>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                {totalPages > 1 && (
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
                )}
            </Card>
        </div>
    )
}
