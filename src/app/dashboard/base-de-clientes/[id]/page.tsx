
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, query, where, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/settings-provider';
import { Loader2, ArrowLeft, User, Mail, Phone, Home, History, Save, ClipboardList, Info, MessageSquare, Wrench, FileText, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Customer, ServiceOrder, Quote, TimelineNote, TimelineItem } from '@/types';


const notesSchema = z.object({
  note: z.string().min(1, { message: 'A anotação não pode estar vazia.' }),
});
type NoteFormValues = z.infer<typeof notesSchema>;

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Aprovado': return 'default';
    case 'Em Andamento': return 'secondary';
    case 'Pendente': return 'secondary';
    case 'Cancelada': return 'destructive';
    case 'Recusado': return 'destructive';
    default: return 'outline';
  }
};

const getTimelineIcon = (type: TimelineItem['type']) => {
    switch (type) {
        case 'creation': return <UserPlus className="h-5 w-5 text-white" />;
        case 'serviceOrder': return <Wrench className="h-5 w-5 text-white" />;
        case 'quote': return <FileText className="h-5 w-5 text-white" />;
        case 'note': return <MessageSquare className="h-5 w-5 text-white" />;
        default: return <History className="h-5 w-5 text-white" />;
    }
}

const getTimelineIconBg = (type: TimelineItem['type']) => {
    switch (type) {
        case 'creation': return 'bg-sky-500';
        case 'serviceOrder': return 'bg-blue-500';
        case 'quote': return 'bg-amber-500';
        case 'note': return 'bg-gray-500';
        default: return 'bg-gray-400';
    }
}

export default function ClienteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [timelineNotes, setTimelineNotes] = useState<TimelineNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const customerId = Array.isArray(id) ? id[0] : id;

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(notesSchema),
    defaultValues: { note: '' },
  });

  useEffect(() => {
    if (!user || !customerId) return;
    
    setIsLoading(true);

    const unsubscribes: (() => void)[] = [];

    // Listener for customer data
    const customerRef = doc(db, 'customers', customerId);
    unsubscribes.push(onSnapshot(customerRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        const data = docSnap.data() as Omit<Customer, 'id'>;
        setCustomer({ id: docSnap.id, ...data });
      } else {
        notFound();
      }
    }));

    // Listener for service orders
    const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('clientId', '==', customerId));
    unsubscribes.push(onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
      setServiceOrders(orders);
    }));

    // Listener for quotes
    const quotesQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid), where('clientId', '==', customerId));
    unsubscribes.push(onSnapshot(quotesQuery, (snapshot) => {
        const quotesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
        setQuotes(quotesData);
    }));
    
    // Listener for timeline notes
    const notesQuery = query(collection(db, 'timelineNotes'), where('userId', '==', user.uid), where('customerId', '==', customerId));
    unsubscribes.push(onSnapshot(notesQuery, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimelineNote));
        setTimelineNotes(notesData);
    }));


    Promise.all([
        new Promise(resolve => onSnapshot(customerRef, resolve)),
    ]).finally(() => setIsLoading(false));


    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, customerId]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!customer) return [];
  
    const allItems: TimelineItem[] = [];
  
    // Add customer creation event if data is valid
    if (customer.createdAt && typeof customer.createdAt.toDate === 'function') {
      allItems.push({
        id: customer.id,
        type: 'creation',
        date: customer.createdAt.toDate(),
        data: customer,
      });
    }
  
    // Add service orders if data is valid
    serviceOrders
      .filter(o => o.createdAt && typeof o.createdAt.toDate === 'function')
      .forEach(o => allItems.push({
        id: o.id,
        type: 'serviceOrder',
        date: o.createdAt.toDate(),
        data: o,
      }));
  
    // Add quotes if data is valid
    quotes
      .filter(q => q.createdAt && typeof q.createdAt.toDate === 'function')
      .forEach(q => allItems.push({
        id: q.id,
        type: 'quote',
        date: q.createdAt.toDate(),
        data: q,
      }));
  
    // Add notes if data is valid
    timelineNotes
      .filter(n => n.createdAt && typeof n.createdAt.toDate === 'function')
      .forEach(n => allItems.push({
        id: n.id,
        type: 'note',
        date: n.createdAt.toDate(),
        data: n,
      }));
  
    return allItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [customer, serviceOrders, quotes, timelineNotes]);

  const onNoteSubmit = async (data: NoteFormValues) => {
    if (!customer || !user) return;
    try {
      await addDoc(collection(db, 'timelineNotes'), {
          note: data.note,
          customerId: customer.id,
          userId: user.uid,
          createdAt: Timestamp.now(),
      });
      toast({ title: 'Sucesso!', description: 'Anotação adicionada à linha do tempo.' });
      form.reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar a anotação.' });
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-48" /></div>
        <div className="grid md:grid-cols-2 gap-6"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const getCustomFieldLabel = (fieldId: string) => settings.customerCustomFields?.find(f => f.id === fieldId)?.name || fieldId;
  const getCustomFieldType = (fieldId: string) => settings.customerCustomFields?.find(f => f.id === fieldId)?.type || 'text';

  const renderTimelineItem = (item: TimelineItem) => {
      const { type, data, date } = item;
      let content = null;

      switch(type) {
        case 'creation':
            content = <p className="font-medium">Cliente cadastrado no sistema.</p>;
            break;
        case 'note':
            const note = data as TimelineNote;
            content = <p className="whitespace-pre-wrap text-muted-foreground">{note.note}</p>;
            break;
        case 'quote':
            const quote = data as Quote;
            content = (
                <div>
                    <p className="font-medium">Orçamento: <Link href={`/dashboard/orcamentos/${quote.id}`} className="text-primary hover:underline">{quote.title}</Link></p>
                    <p className="text-sm">Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.totalValue)}</p>
                    <Badge variant={getStatusVariant(quote.status)} className="mt-1">{quote.status}</Badge>
                </div>
            );
            break;
        case 'serviceOrder':
            const order = data as ServiceOrder;
            content = (
                <div>
                    <p className="font-medium">Ordem de Serviço: <Link href={`/dashboard/servicos/${order.id}`} className="text-primary hover:underline">{order.serviceType}</Link></p>
                    <p className="text-sm">Responsável: {order.collaboratorName || 'Não definido'}</p>
                    <Badge variant={getStatusVariant(order.status)} className="mt-1">{order.status}</Badge>
                </div>
            );
            break;
      }
      
      return (
        <div key={item.id} className="relative pl-12 pb-8">
            <div className="absolute left-0 top-0 flex h-full w-6 justify-center">
                <div className="w-px bg-border h-full"></div>
            </div>
            <div className={`absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full ${getTimelineIconBg(type)}`}>
                {getTimelineIcon(type)}
            </div>
            <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">{format(date, "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <div className="text-sm">{content}</div>
            </div>
        </div>
      );
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
      
      <Card>
        <CardHeader>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>Informações de contato e pessoais.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{customer.phone || 'Não informado'}</span></div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{customer.email || 'Não informado'}</span></div>
            <div className="flex items-start gap-3"><Home className="h-4 w-4 text-muted-foreground mt-1" /><span className='whitespace-pre-wrap'>{customer.address || 'Não informado'}</span></div>
            <div className="flex items-center gap-3"><ClipboardList className="h-4 w-4 text-muted-foreground" /><span>CPF/CNPJ: {customer.cpfCnpj || 'Não informado'}</span></div>
        </CardContent>
      </Card>
      
      {customer.customFields && Object.keys(customer.customFields).length > 0 && (
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(customer.customFields).map(([key, value]) => {
                      if (!value) return null;
                      const fieldType = getCustomFieldType(key);
                      let displayValue = value;
                      if (fieldType === 'date' && value && typeof value === 'object' && 'seconds' in value) {
                          displayValue = format((value as any).toDate(), 'dd/MM/yyyy');
                      }
                      return (
                          <div key={key} className="flex flex-col">
                              <p className="text-sm font-medium">{getCustomFieldLabel(key)}</p>
                              <p className="text-muted-foreground">{String(displayValue) || 'Não informado'}</p>
                          </div>
                      );
                  })}
              </CardContent>
          </Card>
      )}
    
       <Card>
           <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Linha do Tempo de Interações</CardTitle>
           </CardHeader>
           <CardContent>
               <Form {...form}>
                    <form onSubmit={form.handleSubmit(onNoteSubmit)} className="flex items-start gap-4 mb-8">
                        <FormField control={form.control} name="note" render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel className='sr-only'>Nova Anotação</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Adicione uma anotação sobre o cliente (ex: ligou para reagendar, pediu novo orçamento...)" {...field} rows={2}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <Button type="submit" className="mt-2" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar
                        </Button>
                    </form>
                </Form>

                {timelineItems.length > 0 ? (
                    <div>{timelineItems.map(item => renderTimelineItem(item))}</div>
                ) : (
                    <p className="text-center text-muted-foreground py-4">Nenhuma interação encontrada.</p>
                )}
           </CardContent>
       </Card>
    </div>
  );
}

    