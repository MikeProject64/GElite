'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { File, MoreHorizontal, PlusCircle } from 'lucide-react';

const serviceOrders = [
  { id: 'OS-001', client: 'João da Silva', technician: 'Carlos Pereira', status: 'Em Andamento', date: '2024-07-28' },
  { id: 'OS-002', client: 'Maria Oliveira', technician: 'Ana Souza', status: 'Concluído', date: '2024-07-27' },
  { id: 'OS-003', client: 'Pedro Santos', technician: 'Carlos Pereira', status: 'Aguardando Peça', date: '2024-07-26' },
  { id: 'OS-004', client: 'Tech Solutions Ltda', technician: 'Mariana Costa', status: 'Agendado', date: '2024-07-29' },
  { id: 'OS-005', client: 'Global Services Inc', technician: 'Ana Souza', status: 'Cancelado', date: '2024-07-25' },
];

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluído': return 'default';
    case 'Em Andamento': return 'secondary';
    case 'Cancelado': return 'destructive';
    default: return 'outline';
  }
}

export default function OrdensDeServicoPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Ordens de Serviço</h1>
        <div className="flex items-center gap-2">
           <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Exportar
              </span>
            </Button>
            <Button size="sm" className="h-8 gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nova Ordem de Serviço
              </span>
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controle e Acompanhamento de Serviços</CardTitle>
          <CardDescription>Visualize e gerencie todas as ordens de serviço em um único lugar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="pb-4 flex flex-col md:flex-row gap-2">
            <Input placeholder="Filtrar por cliente ou ID..." className="max-w-sm"/>
             <Select>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="em-andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.client}</TableCell>
                  <TableCell>{order.technician}</TableCell>
                  <TableCell>
                     <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell>{order.date}</TableCell>
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
                        <DropdownMenuItem className="text-red-600">Cancelar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>1-5</strong> de <strong>{serviceOrders.length}</strong> ordens de serviço.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
