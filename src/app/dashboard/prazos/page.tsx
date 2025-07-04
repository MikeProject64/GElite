'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format, isPast, isToday, differenceInDays } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface ServiceOrder {
    id: string;
    clientName: string;
    serviceType: string;
    status: 'Pendente' | 'Em Andamento' | 'Aguardando Peça' | 'Concluída' | 'Cancelada';
    dueDate: Timestamp;
    userId: string;
    createdAt: Timestamp;
}

const getDueDateStatus = (dueDate: Date) => {
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { text: 'Vencido', variant: 'destructive' as const };
    }
    if (isToday(dueDate)) {
      return { text: 'Vence Hoje', variant: 'secondary' as const, className: 'text-amber-600 border-amber-600' };
    }
    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue <= 3) {
      return { text: `Vence em ${daysUntilDue + 1} dia(s)`, variant: 'outline' as const, className: 'text-blue-600 border-blue-600' };
    }
    return { text: format(dueDate, 'dd/MM/yyyy'), variant: 'outline' as const };
};

export default function PrazosPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        
        const q = query(
            collection(db, "serviceOrders"), 
            where("userId", "==", user.uid),
            orderBy("dueDate", "asc")
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const activeStatuses = ['Pendente', 'Em Andamento', 'Aguardando Peça'];
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
            toast({
                variant: "destructive",
                title: "Erro ao buscar dados",
                description: description,
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast]);

    const handleRowClick = (orderId: string) => {
        // Futuramente, isso levaria para a página de detalhes da OS.
        // router.push(`/dashboard/ordens-de-servico/${orderId}`);
        toast({ title: "Navegação", description: `Redirecionando para detalhes da OS: ${orderId}`});
    };

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Prazos de Entrega</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Controle de Prazos</CardTitle>
                    <CardDescription>Visualize rapidamente todas as ordens de serviço com vencimentos próximos ou expirados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                         <div className="text-center py-10">
                            <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Nenhuma ordem de serviço ativa.</h3>
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
                                {orders.map((order) => {
                                    const dueDate = order.dueDate.toDate();
                                    const statusInfo = getDueDateStatus(dueDate);
                                    return (
                                        <TableRow 
                                            key={order.id} 
                                            // onClick={() => handleRowClick(order.id)}
                                            // className="cursor-pointer"
                                        >
                                            <TableCell className="font-medium">{order.clientName}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{order.serviceType}</TableCell>
                                            <TableCell>
                                                <Badge variant={order.status === 'Em Andamento' ? 'secondary' : 'outline'}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={statusInfo.variant} className={statusInfo.className}>
                                                    {statusInfo.text}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        Mostrando <strong>{orders.length}</strong> ordens de serviço ativas.
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
