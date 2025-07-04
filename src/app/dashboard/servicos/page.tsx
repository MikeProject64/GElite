'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, Wrench, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ServiceOrder {
    id: string;
    clientName: string;
    serviceType: string;
    technician: string;
    status: 'Pendente' | 'Em Andamento' | 'Aguardando Peça' | 'Concluída' | 'Cancelada';
    createdAt: Timestamp;
    userId: string;
    dueDate: Timestamp;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Em Andamento': return 'secondary';
    case 'Cancelada': return 'destructive';
    default: return 'outline';
  }
};

export default function ServicosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', technician: '', clientName: '' });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    const qOrders = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (querySnapshot) => {
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceOrder));
      setServiceOrders(orders);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching service orders: ", error);
        let description = "Não foi possível carregar as ordens de serviço. Verifique suas regras de segurança do Firestore.";
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            description = "A consulta ao banco de dados requer um índice. Verifique o console de depuração do navegador para obter o link para criar o índice.";
        }
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: description,
        });
        setIsLoading(false);
    });

    return () => {
        unsubscribeOrders();
    };
  }, [user, toast]);

  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(order => {
        const statusMatch = filters.status ? order.status === filters.status : true;
        const technicianMatch = filters.technician ? order.technician.toLowerCase().includes(filters.technician.toLowerCase()) : true;
        const clientMatch = filters.clientName ? order.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) : true;
        return statusMatch && technicianMatch && clientMatch;
    });
  }, [serviceOrders, filters]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Serviços</h1>
        <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/dashboard/servicos/criar">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Nova Ordem de Serviço
                </span>
            </Link>
        </Button>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>
                <span className="flex items-center gap-2">
                    <Filter className="h-5 w-5"/>
                    Filtros de Acompanhamento
                </span>
            </CardTitle>
             <CardDescription>Use os filtros abaixo para refinar a visualização das suas ordens de serviço.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client-filter">Filtrar por Cliente</Label>
                <Input id="client-filter" placeholder="Nome do cliente..." value={filters.clientName} onChange={e => handleFilterChange('clientName', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="technician-filter">Filtrar por Técnico</Label>
                <Input id="technician-filter" placeholder="Nome do técnico..." value={filters.technician} onChange={e => handleFilterChange('technician', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status-filter">Filtrar por Status</Label>
                 <Select value={filters.status} onValueChange={value => handleFilterChange('status', value === 'all' ? '' : value)}>
                    <SelectTrigger id="status-filter">
                        <SelectValue placeholder="Todos os Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                        <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                </Select>
              </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controle e Acompanhamento de Serviços</CardTitle>
          <CardDescription>Visualize e gerencie todas as ordens de serviço em um único lugar.</CardDescription>
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
                <p className="text-sm text-muted-foreground">Que tal criar a primeira?</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden lg:table-cell">Serviço</TableHead>
                    <TableHead className="hidden md:table-cell">Técnico</TableHead>
                    <TableHead className="hidden lg:table-cell">Criação</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                    <TableCell>
                        <div className="font-medium">{order.clientName}</div>
                        <div className="text-sm text-muted-foreground lg:hidden">{order.serviceType}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{order.serviceType}</TableCell>
                    <TableCell className="hidden md:table-cell">{order.technician}</TableCell>
                    <TableCell className="hidden lg:table-cell">{order.createdAt ? format(order.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{order.dueDate ? format(order.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
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
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">Cancelar OS</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredOrders.length}</strong> de <strong>{serviceOrders.length}</strong> ordens de serviço.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
