
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const serviceOrderSchema = z.object({
  clientId: z.string().min(1, { message: 'Por favor, selecione um cliente.' }),
  clientName: z.string(),
  serviceType: z.string().min(3, { message: 'O tipo de serviço é obrigatório.' }),
  problemDescription: z.string().min(10, { message: 'Descreva o problema com mais detalhes.' }),
  technician: z.string().min(3, { message: 'O nome do técnico é obrigatório.' }),
  status: z.enum(['Pendente', 'Em Andamento', 'Aguardando Peça', 'Concluída', 'Cancelada']),
  dueDate: z.coerce.date({ required_error: "A data de vencimento é obrigatória." }),
});

const newCustomerSchema = z.object({
  name: z.string().min(3, { message: 'O nome do cliente é obrigatório.' }),
  phone: z.string().min(10, { message: 'O telefone é obrigatório (mínimo 10 dígitos).' }),
  email: z.string().email({ message: 'Insira um e-mail válido.' }).optional().or(z.literal('')),
  address: z.string().optional(),
  cpfCnpj: z.string().optional(),
  birthDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional(),
});

type ServiceOrderFormValues = z.infer<typeof serviceOrderSchema>;
type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function CriarOrdemDeServicoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isNewClientSubmitting, setIsNewClientSubmitting] = useState(false);

  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      clientId: '',
      clientName: '',
      serviceType: '',
      problemDescription: '',
      technician: '',
      status: 'Pendente',
    },
  });

  const newClientForm = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      name: '', phone: '', email: '', address: '',
      cpfCnpj: '', birthDate: null, notes: '',
    },
  });

  useEffect(() => {
    if (!user) return;
    const qCustomers = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (querySnapshot) => {
      const customerList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customerList);
    }, (error) => {
        console.error("Error fetching customers: ", error);
        toast({ variant: "destructive", title: "Erro ao buscar clientes", description: "Não foi possível carregar a lista de clientes." });
    });
    return () => unsubscribeCustomers();
  }, [user, toast]);

  const onNewClientSubmit = async (values: NewCustomerFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    setIsNewClientSubmitting(true);
    try {
      const q = query(collection(db, 'customers'), where('userId', '==', user.uid), where('phone', '==', values.phone));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente com este telefone." });
        setIsNewClientSubmitting(false);
        return;
      }
      const docRef = await addDoc(collection(db, 'customers'), {
        ...values,
        birthDate: values.birthDate ? Timestamp.fromDate(values.birthDate) : null,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Cliente cadastrado." });
      form.setValue('clientId', docRef.id);
      form.setValue('clientName', values.name);
      newClientForm.reset();
      setIsNewClientDialogOpen(false);
    } catch (error) {
      console.error("Error adding client: ", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao cadastrar o cliente." });
    } finally {
      setIsNewClientSubmitting(false);
    }
  };
  
  const onSubmit = async (values: ServiceOrderFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado para criar uma ordem de serviço." });
        return;
    }
    setIsFormSubmitting(true);
    try {
      await addDoc(collection(db, 'serviceOrders'), {
        ...values,
        dueDate: Timestamp.fromDate(values.dueDate),
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Ordem de serviço criada." });
      router.push('/dashboard/servicos');
    } catch (error: any) {
      console.error("Error adding document: ", error);
      toast({ variant: "destructive", title: "Erro ao criar ordem", description: "Falha ao criar a ordem de serviço." });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/servicos">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Criar Nova Ordem de Serviço
        </h1>
      </div>
      <Card>
         <CardHeader>
            <CardTitle>Detalhes da Ordem de Serviço</CardTitle>
            <CardDescription>
                Preencha os detalhes abaixo para criar uma nova ordem de serviço.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-4">
                        <FormLabel>Cliente</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() => setIsNewClientDialogOpen(true)}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          <span>Novo Cliente</span>
                        </Button>
                      </div>
                      <Select
                        onValueChange={(value) => {
                          const selectedCustomer = customers.find(c => c.id === value);
                          if(selectedCustomer) {
                            field.onChange(value);
                            form.setValue("clientName", selectedCustomer.name);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente existente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.length === 0 && <p className='p-4 text-sm text-muted-foreground'>Nenhum cliente cadastrado.</p>}
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} ({customer.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="serviceType" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Serviço</FormLabel> <FormControl><Input placeholder="Ex: Manutenção de Ar Condicionado" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="problemDescription" render={({ field }) => ( <FormItem> <FormLabel>Descrição do Problema</FormLabel> <FormControl><Textarea placeholder="Detalhe o problema relatado pelo cliente..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="technician" render={({ field }) => ( <FormItem> <FormLabel>Técnico Responsável</FormLabel> <FormControl><Input placeholder="Ex: Carlos Pereira" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Vencimento</FormLabel>
                      <FormControl>
                         <Input
                          type="date"
                          value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl> <SelectTrigger> <SelectValue placeholder="Selecione o status inicial" /> </SelectTrigger> </FormControl> <SelectContent> <SelectItem value="Pendente">Pendente</SelectItem> <SelectItem value="Em Andamento">Em Andamento</SelectItem> <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem> <SelectItem value="Concluída">Concluída</SelectItem> <SelectItem value="Cancelada">Cancelada</SelectItem> </SelectContent> </Select> <FormMessage /> </FormItem> )} />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/servicos')}>Cancelar</Button>
                    <Button type="submit" disabled={isFormSubmitting}>
                        {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Ordem de Serviço
                    </Button>
                </div>
              </form>
            </Form>
        </CardContent>
      </Card>

      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                <DialogDescription>
                    Preencha os detalhes para adicionar um novo cliente. Nome e telefone são obrigatórios.
                </DialogDescription>
            </DialogHeader>
            <Form {...newClientForm}>
                <form id="new-client-form" onSubmit={newClientForm.handleSubmit(onNewClientSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    <FormField control={newClientForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Nome Completo</FormLabel> <FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={newClientForm.control} name="phone" render={({ field }) => ( <FormItem> <FormLabel>Telefone</FormLabel> <FormControl><Input placeholder="Ex: (11) 99999-8888" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={newClientForm.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>E-mail (Opcional)</FormLabel> <FormControl><Input placeholder="Ex: maria.oliveira@email.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={newClientForm.control} name="address" render={({ field }) => ( <FormItem> <FormLabel>Endereço (Opcional)</FormLabel> <FormControl><Textarea placeholder="Rua das Flores, 123, Bairro, Cidade - Estado" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={newClientForm.control} name="cpfCnpj" render={({ field }) => ( <FormItem> <FormLabel>CPF/CNPJ (Opcional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField
                      control={newClientForm.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento (Opcional)</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={newClientForm.control} name="notes" render={({ field }) => ( <FormItem> <FormLabel>Observações (Opcional)</FormLabel> <FormControl><Textarea placeholder="Informações adicionais sobre o cliente..." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </form>
            </Form>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsNewClientDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" form="new-client-form" disabled={isNewClientSubmitting}>
                    {isNewClientSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Cliente
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
}

    