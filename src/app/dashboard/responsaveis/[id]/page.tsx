
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Briefcase, Eye } from 'lucide-react';
import { ServiceOrder, Manager } from '@/types';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Cancelada': return 'destructive';
    default:
        const hash = status.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        return (Math.abs(hash) % 2 === 0) ? 'secondary' : 'outline';
  }
};

export default function ResponsavelDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [manager, setManager] = useState<Manager | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const managerId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!user || !managerId) return;

    setIsLoading(true);

    // Listener for manager data
    const managerRef = doc(db, 'managers', managerId);
    const unsubscribeManager = onSnapshot(managerRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        setManager({ id: docSnap.id, ...docSnap.data() } as Manager);
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Responsável não encontrado ou você não tem permissão para visualizá-lo.' });
        router.push('/dashboard/responsaveis');
      }
    }, (error) => {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar os dados do responsável.' });
        setIsLoading(false);
    });

    // Listener for service orders
    const ordersQuery = query(
      collection(db, 'serviceOrders'),
      where('userId', '==', user.uid),
      where('managerId', '==', managerId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
      setServiceOrders(orders);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching service orders for manager:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar o histórico de serviços.' });
        setIsLoading(false);
    });

    return () => {
      unsubscribeManager();
      unsubscribeOrders();
    };
  }, [user, managerId, router, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!manager) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/responsaveis"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <Briefcase className='h-5 w-5' />
            Serviços de: {manager.name}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens de Serviço Atribuídas</CardTitle>
          <CardDescription>Lista de todos os serviços sob a responsabilidade de {manager.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {serviceOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Serviço / Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/dashboard/servicos/${order.id}`} className="font-mono text-sm font-medium hover:underline">
                        #{order.id.substring(0, 6).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/servicos/${order.id}`} className="font-medium hover:underline">{order.serviceType}</Link>
                        <div className="text-sm text-muted-foreground">{order.clientName}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{order.dueDate ? format(order.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                     <TableCell>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/servicos/${order.id}`)}>
                            <Eye className="mr-2 h-3 w-3" /> Ver
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">Nenhuma ordem de serviço encontrada para este responsável.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    