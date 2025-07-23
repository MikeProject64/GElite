'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ServiceOrder } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { MonthlyRevenueChart } from '@/components/dashboard/monthly-revenue-chart';
import { OrderStatusChart } from '@/components/dashboard/order-status-chart';
import { ServiceTypeChart } from '@/components/dashboard/service-type-chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


export default function ServicosEstatisticasPage() {
    const { user } = useAuth();
    const { settings, loading: settingsLoading } = useSettings();
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
            setServiceOrders(orders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching service orders: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const performanceData = useMemo(() => {
        if (!serviceOrders.length) return [];
        
        const performance: { [key: string]: { name: string; orders: number; totalValue: number } } = {};

        serviceOrders.forEach(order => {
            const assignedTo = (order as any).collaboratorName || 'Não atribuído';
            if (!performance[assignedTo]) {
                performance[assignedTo] = { name: assignedTo, orders: 0, totalValue: 0 };
            }
            performance[assignedTo].orders += 1;
            performance[assignedTo].totalValue += order.totalValue || 0;
        });

        return Object.values(performance).sort((a, b) => b.orders - a.orders);
    }, [serviceOrders]);

    const stats = useMemo(() => {
        if (!serviceOrders.length) {
            return {
                activeOrders: 0,
                monthlyRevenue: 0,
                avgCompletionTime: '00d 00h 00m',
            };
        }

        // Ordens ativas são todas que não estão Concluídas ou Canceladas.
        const activeOrders = serviceOrders.filter(
            order => order.status !== 'Concluído' && order.status !== 'Cancelado'
        ).length;

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        const monthlyRevenue = serviceOrders
            .filter(order => {
                if (order.status !== 'Concluído') return false;
                if (!order.conclusionDate) return false;
                const conclusionDate = (order.conclusionDate as Timestamp).toDate();
                return conclusionDate.getMonth() === currentMonth && conclusionDate.getFullYear() === currentYear;
            })
            .reduce((sum, order) => sum + (order.totalValue || 0), 0);

        // Apenas ordens concluídas com sucesso entram no cálculo de tempo.
        const completedOrders = serviceOrders.filter(o => o.status === 'Concluído' && o.creationDate && o.conclusionDate);
        
        let formattedAvgTime = '00d 00h 00m';
        if (completedOrders.length > 0) {
            const totalCompletionTime = completedOrders.reduce((sum, order) => {
                const startTime = (order.creationDate as Timestamp).toDate().getTime();
                const endTime = (order.conclusionDate as Timestamp).toDate().getTime();
                return sum + (endTime - startTime);
            }, 0);

            const avgTimeInMillis = totalCompletionTime / completedOrders.length;
            const totalSeconds = Math.floor(avgTimeInMillis / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor(((totalSeconds % 86400) % 3600) / 60);
            
            formattedAvgTime = `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
        }

        return {
            activeOrders,
            monthlyRevenue,
            avgCompletionTime: formattedAvgTime,
        };
    }, [serviceOrders]);

    if (loading || settingsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Ordens Ativas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeOrders}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento no Mês</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Tempo Médio de Conclusão</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgCompletionTime}</div>
                        <p className="text-xs text-muted-foreground">
                            Das ordens concluídas
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Receita Mensal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MonthlyRevenueChart orders={serviceOrders} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Ordens de Serviço por Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <OrderStatusChart orders={serviceOrders} statuses={settings?.serviceStatuses || []} />
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Tipos de Serviço Mais Realizados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ServiceTypeChart orders={serviceOrders} />
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Performance da Equipe</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Responsável</TableHead>
                                    <TableHead className="text-right">Ordens</TableHead>
                                    <TableHead className="text-right">Valor Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {performanceData.map(item => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.orders}</TableCell>
                                        <TableCell className="text-right">
                                            {item.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 