'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle } from 'lucide-react';

const serviceOrderSchema = z.object({
  clientName: z.string().min(3, { message: 'O nome do cliente é obrigatório.' }),
  serviceType: z.string().min(3, { message: 'O tipo de serviço é obrigatório.' }),
  problemDescription: z.string().min(10, { message: 'Descreva o problema com mais detalhes.' }),
  technician: z.string().min(3, { message: 'O nome do técnico é obrigatório.' }),
  status: z.enum(['Pendente', 'Em Andamento', 'Aguardando Peça', 'Concluída', 'Cancelada']),
});

type ServiceOrderFormValues = z.infer<typeof serviceOrderSchema>;

interface ServiceOrder extends ServiceOrderFormValues {
    id: string;
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
};

export default function OrdensDeServicoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      clientName: '',
      serviceType: '',
      problemDescription: '',
      technician: '',
      status: 'Pendente',
    },
  });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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

    return () => unsubscribe();
  }, [user, toast]);

  const onSubmit = async (values: ServiceOrderFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado para criar uma ordem de serviço." });
        return;
    }
    setIsFormSubmitting(true);
    try {
      await addDoc(collection(db, 'serviceOrders'), {
        ...values,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Ordem de serviço criada." });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar ordem",
        description: "Falha ao criar a ordem de serviço. Verifique as regras de segurança do Firestore."
      });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Ordens de Serviço</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Nova Ordem de Serviço
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Ordem de Serviço</DialogTitle>
              <DialogDescription>
                Preencha os detalhes abaixo para criar uma nova ordem de serviço.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="clientName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="serviceType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Serviço</FormLabel>
                    <FormControl><Input placeholder="Ex: Manutenção de Ar Condicionado" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="problemDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Problema</FormLabel>
                    <FormControl><Textarea placeholder="Detalhe o problema relatado pelo cliente..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="technician" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Técnico Responsável</FormLabel>
                    <FormControl><Input placeholder="Ex: Carlos Pereira" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status inicial" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Pendente">Pendente</SelectItem>
                                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                                <SelectItem value="Concluída">Concluída</SelectItem>
                                <SelectItem value="Cancelada">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                 <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isFormSubmitting}>
                        {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controle e Acompanhamento de Serviços</CardTitle>
          <CardDescription>Crie, visualize e gerencie todas as ordens de serviço em um único lugar.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : serviceOrders.length === 0 ? (
            <div className="text-center py-10">
                <h3 className="text-lg font-semibold">Nenhuma ordem de serviço encontrada.</h3>
                <p className="text-sm text-muted-foreground">Que tal criar a primeira?</p>
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
                  <TableCell>
                    <div className="font-medium">{order.clientName}</div>
                    <div className="text-sm text-muted-foreground hidden md:inline">{order.serviceType}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{order.technician}</TableCell>
                  <TableCell>
                     <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</TableCell>
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
          )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{serviceOrders.length}</strong> de <strong>{serviceOrders.length}</strong> ordens de serviço.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
