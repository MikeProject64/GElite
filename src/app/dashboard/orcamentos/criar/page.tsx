
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CalendarIcon, ChevronsUpDown, Check, FileText } from 'lucide-react';

const quoteSchema = z.object({
  clientId: z.string({ required_error: "Por favor, selecione um cliente." }).min(1, "Por favor, selecione um cliente."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  totalValue: z.coerce.number().min(0.01, "O valor total deve ser maior que zero."),
  validUntil: z.date({ required_error: "A data de validade é obrigatória." }),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface Customer {
  id: string;
  name: string;
}

export default function CriarOrcamentoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      clientId: '',
      description: '',
      totalValue: 0,
      validUntil: addDays(new Date(), 7), // Default validity of 7 days
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
  
  const onSubmit = async (data: QuoteFormValues) => {
    if (!user) return;
    try {
      const selectedCustomer = customers.find(c => c.id === data.clientId);
      if (!selectedCustomer) throw new Error("Cliente não encontrado");

      await addDoc(collection(db, 'quotes'), {
        ...data,
        clientName: selectedCustomer.name,
        validUntil: Timestamp.fromDate(data.validUntil),
        userId: user.uid,
        status: 'Pendente',
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Orçamento criado." });
      router.push('/dashboard/orcamentos');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: `Falha ao criar o orçamento: ${error.message}` });
    }
  };

  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/orcamentos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <FileText className='h-5 w-5' />
            Criar Novo Orçamento
        </h1>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Detalhes do Orçamento</CardTitle>
            <CardDescription>Preencha os detalhes abaixo para criar uma nova proposta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Cliente *</FormLabel>
                       <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                              {field.value ? customers.find((c) => c.id === field.value)?.name : "Selecione um cliente"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandList>
                               <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                <CommandGroup>
                                {customers.map((customer) => (
                                    <CommandItem
                                        value={customer.name}
                                        key={customer.id}
                                        onSelect={() => {
                                            form.setValue("clientId", customer.id)
                                            setIsComboboxOpen(false)
                                        }}
                                        >
                                        <Check className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")}/>
                                        {customer.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição dos Serviços/Produtos *</FormLabel><FormControl><Textarea placeholder="Detalhe os itens do orçamento..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
              )}/>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField control={form.control} name="totalValue" render={({ field }) => (
                    <FormItem><FormLabel>Valor Total (R$) *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="250,00" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>

                <FormField control={form.control} name="validUntil" render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Válido Até *</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}/>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/orcamentos')}>Cancelar</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Orçamento
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
