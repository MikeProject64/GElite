
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, User, Mail, Phone, Home, History, Save, ClipboardList } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  cpfCnpj: string;
  birthDate: { seconds: number; nanoseconds: number; } | null;
  notes: string;
}

interface ServiceOrder {
  id: string;
  serviceType: string;
  status: string;
  createdAt: { seconds: number; nanoseconds: number; };
}

const notesSchema = z.object({
  notes: z.string().optional(),
});
type NotesFormValues = z.infer<typeof notesSchema>;

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Em Andamento': return 'secondary';
    case 'Cancelada': return 'destructive';
    default: return 'outline';
  }
};

export default function ClienteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<NotesFormValues>({
    resolver: zodResolver(notesSchema),
  });

  useEffect(() => {
    if (!user || !id) return;
    
    setIsLoading(true);

    const customerId = Array.isArray(id) ? id[0] : id;

    // Listener for customer data
    const customerRef = doc(db, 'customers', customerId);
    const unsubscribeCustomer = onSnapshot(customerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<Customer, 'id'>;
        setCustomer({ id: docSnap.id, ...data });
        form.reset({ notes: data.notes || '' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Cliente não encontrado.' });
        router.push('/dashboard/base-de-clientes');
      }
      setIsLoading(false);
    });

    // Listener for service orders
    const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('clientId', '==', customerId));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
      setServiceOrders(orders);
    });

    return () => {
      unsubscribeCustomer();
      unsubscribeOrders();
    };
  }, [user, id, router, toast, form]);

  const onNotesSubmit = async (data: NotesFormValues) => {
    if (!customer) return;
    try {
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, { notes: data.notes });
      toast({ title: 'Sucesso!', description: 'Observações salvas.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar as observações.' });
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
           <Skeleton className="h-64" />
           <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/base-de-clientes"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <User className='h-5 w-5' />
            Detalhes do Cliente
        </h1>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>Informações de contato e pessoais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone || 'Não informado'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email || 'Não informado'}</span>
            </div>
             <div className="flex items-start gap-3">
              <Home className="h-4 w-4 text-muted-foreground mt-1" />
              <span className='whitespace-pre-wrap'>{customer.address || 'Não informado'}</span>
            </div>
            <div className="flex items-center gap-3">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span>CPF/CNPJ: {customer.cpfCnpj || 'Não informado'}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
            <CardDescription>Notas e informações adicionais sobre o cliente.</CardDescription>
          </CardHeader>
          <CardContent>
             <Form {...form}>
              <form onSubmit={form.handleSubmit(onNotesSubmit)} className="space-y-4">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className='sr-only'>Observações</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Adicione observações sobre o cliente aqui..." {...field} rows={6}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                 <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Observações
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Serviços</CardTitle>
          <CardDescription>Todas as ordens de serviço associadas a este cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          {serviceOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.serviceType}</TableCell>
                    <TableCell>{format(new Date(order.createdAt.seconds * 1000), 'dd/MM/yyyy')}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">Nenhuma ordem de serviço encontrada para este cliente.</p>
          )}
        </CardContent>
       </Card>
    </div>
  );
}
