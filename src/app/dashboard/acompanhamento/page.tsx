
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2, Wrench } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface ServiceOrder {
    id: string;
    clientName: string;
    technician: string;
    status: string;
    createdAt: Timestamp;
    userId: string;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Em Andamento': return 'secondary';
    case 'Cancelada': return 'destructive';
    default: return 'outline';
  }
}

export default function AcompanhamentoPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const q = query(
            collection(db, 'serviceOrders'), 
            where('userId', '==', user.uid), 
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const orders = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ServiceOrder));
            setServiceOrders(orders);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Error fetching service orders: ", error);
            let description = "Não foi possível carregar as ordens. Verifique suas regras de segurança do Firestore.";
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                description = "A consulta ao banco de dados requer um índice. Verifique o console de depuração para obter o link para criar o índice.";
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

    return (
        <div className="flex flex-col gap-4">
             <h1 className="text-lg font-semibold md:text-2xl">Acompanhamento</h1>
             <Card>
                <CardHeader>
                    <CardTitle>Acompanhamento Geral de Ordens</CardTitle>
                    <CardDescription>Visualize o status de todas as ordens de serviço cadastradas.</CardDescription>
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
                        <p className="text-sm text-muted-foreground">Crie sua primeira ordem na página "Ordens de Serviço".</p>
                    </div>
                 ) : (
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden md:table-cell">Técnico</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Data de Criação</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {serviceOrders.map((order) => (
                        <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.clientName}</TableCell>
                        <TableCell className="hidden md:table-cell">{order.technician}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {order.createdAt ? format(order.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}
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
                                <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                )}
                </CardContent>
                 <CardFooter>
                <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{serviceOrders.length}</strong> de <strong>{serviceOrders.length}</strong> ordens de serviço.
                </div>
                </CardFooter>
            </Card>
        </div>
    )
}
