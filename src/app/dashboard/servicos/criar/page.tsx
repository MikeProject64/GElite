'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus, CalendarIcon, ChevronsUpDown, Check, FilePlus } from 'lucide-react';

// Schemas
const serviceOrderSchema = z.object({
  clientId: z.string({ required_error: "Por favor, selecione um cliente." }).min(1, "Por favor, selecione um cliente."),
  serviceType: z.string().min(1, "O tipo de serviço é obrigatório."),
  problemDescription: z.string().min(1, "A descrição do problema é obrigatória."),
  technician: z.string().min(1, "O técnico é obrigatório."),
  status: z.enum(['Pendente', 'Em Andamento', 'Aguardando Peça', 'Concluída', 'Cancelada']),
  dueDate: z.date({ required_error: "A data de vencimento é obrigatória." }),
});

const newCustomerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  phone: z.string().min(10, "O telefone deve ter pelo menos 10 caracteres."),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  cpfCnpj: z.string().optional(),
  birthDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type ServiceOrderValues = z.infer<typeof serviceOrderSchema>;
type NewCustomerValues = z.infer<typeof newCustomerSchema>;

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
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const serviceOrderForm = useForm<ServiceOrderValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      clientId: '',
      serviceType: '',
      problemDescription: '',
      technician: '',
      status: 'Pendente',
      dueDate: new Date(),
    },
  });
  const newCustomerForm = useForm<NewCustomerValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      cpfCnpj: '',
      birthDate: null,
      notes: '',
    },
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCustomers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (error) => {
        console.error("Error fetching customers: ", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar a lista de clientes." });
    });
    return () => unsubscribe();
  }, [user, toast]);
  
  useEffect(() => {
    if(!isNewClientDialogOpen) {
      newCustomerForm.reset();
    }
  }, [isNewClientDialogOpen, newCustomerForm]);

  const onNewClientSubmit = async (data: NewCustomerValues) => {
    if (!user) return;
    try {
      const q = query(collection(db, 'customers'), where('userId', '==', user.uid), where('phone', '==', data.phone));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente com este telefone." });
        return;
      }
      const docRef = await addDoc(collection(db, 'customers'), {
        ...data,
        birthDate: data.birthDate ? Timestamp.fromDate(data.birthDate) : null,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Cliente cadastrado." });
      serviceOrderForm.setValue('clientId', docRef.id, { shouldValidate: true, shouldTouch: true });
      setIsNewClientDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao cadastrar o cliente." });
    }
  };
  
  const onServiceOrderSubmit = async (data: ServiceOrderValues) => {
    if (!user) return;
    try {
      const selectedCustomer = customers.find(c => c.id === data.clientId);
      if (!selectedCustomer) throw new Error("Cliente não encontrado");

      await addDoc(collection(db, 'serviceOrders'), {
        ...data,
        clientName: selectedCustomer.name,
        dueDate: Timestamp.fromDate(data.dueDate),
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Ordem de serviço criada." });
      router.push('/dashboard/servicos');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: `Falha ao criar a ordem de serviço: ${error.message}` });
    }
  };

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/servicos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <FilePlus className='h-5 w-5' />
            Criar Nova Ordem de Serviço
        </h1>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Detalhes da Ordem de Serviço</CardTitle>
            <CardDescription>Preencha os detalhes abaixo para criar uma nova ordem de serviço.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...serviceOrderForm}>
            <form onSubmit={serviceOrderForm.handleSubmit(onServiceOrderSubmit)} className="space-y-6">
              <FormField control={serviceOrderForm.control} name="clientId" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Cliente *</FormLabel>
                    <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setIsNewClientDialogOpen(true)}>
                      <UserPlus className="mr-2 h-3.5 w-3.5" /> Novo Cliente
                    </Button>
                  </div>
                  <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                          <span className='truncate'>
                            {field.value ? customers.find(c => c.id === field.value)?.name : "Selecione um cliente"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()} className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar cliente por nome ou telefone..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name + " " + customer.phone}
                                onSelect={() => {
                                  field.onChange(customer.id);
                                  setIsComboboxOpen(false);
                                }}
                              >
                                <div className="flex w-full items-center justify-between">
                                  <div className="flex items-center">
                                    <Check className={cn("mr-2 h-4 w-4", field.value === customer.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex-1">
                                      <div>{customer.name}</div>
                                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={serviceOrderForm.control} name="serviceType" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Serviço *</FormLabel><FormControl><Input placeholder="Ex: Manutenção de Ar Condicionado" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={serviceOrderForm.control} name="problemDescription" render={({ field }) => (
                <FormItem><FormLabel>Descrição do Problema *</FormLabel><FormControl><Textarea placeholder="Detalhe o problema relatado pelo cliente..." {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={serviceOrderForm.control} name="technician" render={({ field }) => (
                <FormItem><FormLabel>Técnico Responsável *</FormLabel><FormControl><Input placeholder="Ex: Carlos Pereira" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={serviceOrderForm.control} name="dueDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                           <span className='flex w-full items-center justify-between'>
                             {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                            <CalendarIcon className="h-4 w-4 opacity-50" />
                           </span>
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={serviceOrderForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status inicial" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem><SelectItem value="Concluída">Concluída</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/servicos')}>Cancelar</Button>
                  <Button type="submit" disabled={serviceOrderForm.formState.isSubmitting}>
                      {serviceOrderForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Ordem de Serviço
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar Novo Cliente</DialogTitle><DialogDescription>Preencha os detalhes para adicionar um novo cliente.</DialogDescription></DialogHeader>
            <Form {...newCustomerForm}>
              <form onSubmit={newCustomerForm.handleSubmit(onNewClientSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                <FormField control={newCustomerForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={newCustomerForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone *</FormLabel><FormControl><Input placeholder="Ex: (11) 99999-8888" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={newCustomerForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="Ex: maria.oliveira@email.com" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={newCustomerForm.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Endereço</FormLabel><FormControl><Textarea placeholder="Rua das Flores, 123, Bairro, Cidade - Estado" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={newCustomerForm.control} name="cpfCnpj" render={({ field }) => ( <FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="Opcional" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={newCustomerForm.control} name="birthDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Nascimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            <span className='flex w-full items-center justify-between'>
                              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                              <CalendarIcon className="h-4 w-4 opacity-50" />
                            </span>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={newCustomerForm.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Informações adicionais..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsNewClientDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={newCustomerForm.formState.isSubmitting}>
                      {newCustomerForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Cliente
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
    </Dialog>
    </div>
  );
}
