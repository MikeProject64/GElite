'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

// Dados de exemplo
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

export default function AcompanhamentoPage() {
    return (
        <div className="flex flex-col gap-4">
             <h1 className="text-lg font-semibold md:text-2xl">Acompanhamento</h1>
             <Card>
                <CardHeader>
                <CardTitle>Acompanhamento de Ordens</CardTitle>
                <CardDescription>Visualize o status geral de todas as ordens de serviço.</CardDescription>
                </CardHeader>
                <CardContent>
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
    )
}
