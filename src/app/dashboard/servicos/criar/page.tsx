'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const serviceOrderSchema = z.object({
  clientId: z.string().min(1, { message: 'Por favor, selecione um cliente.' }),
  clientName: z.string(),
  serviceType: z.string().min(3, { message: 'O tipo de serviço é obrigatório.' }),
  problemDescription: z.string().min(10, { message: 'Descreva o problema com mais detalhes.' }),
  technician: z.string().min(3, { message: 'O nome do técnico é obrigatório.' }),
  status: z.enum(['Pendente', 'Em Andamento', 'Aguardando Peça', 'Concluída', 'Cancelada']),
  dueDate: z.date({ required_error: "A data de vencimento é obrigatória." }),
});

type ServiceOrderFormValues = z.infer<typeof serviceOrderSchema>;

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
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    
    // Listener for customers
    const qCustomers = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (querySnapshot) => {
      const customerList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Customer));
      setCustomers(customerList);
    }, (error) => {
        console.error("Error fetching customers: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar clientes",
            description: "Não foi possível carregar a lista de clientes.",
        });
    });

    return () => {
        unsubscribeCustomers();
    };
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
        dueDate: Timestamp.fromDate(values.dueDate),
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Ordem de serviço criada." });
      router.push('/dashboard/servicos');
    } catch (error: any) {
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente</FormLabel>
                      <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? customers.find(
                                    (customer) => customer.id === field.value
                                  )?.name
                                : "Selecione um cliente"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {customers.map((customer) => (
                                <CommandItem
                                  value={customer.name}
                                  key={customer.id}
                                  onSelect={() => {
                                    form.setValue("clientId", customer.id);
                                    form.setValue("clientName", customer.name);
                                    setIsComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customer.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <div>{customer.name}</div>
                                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vencimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Escolha uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setDate(new Date().getDate() - 1))
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
    </div>
  );
}
