
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CalendarIcon, ChevronsUpDown, Check, FileText, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Customer, Quote } from '@/types';

const quoteSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  clientId: z.string({ required_error: "Por favor, selecione um cliente." }).min(1, "Por favor, selecione um cliente."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  totalValue: z.coerce.number().min(0.01, "O valor total deve ser maior que zero."),
  validUntil: z.date({ required_error: "A data de validade é obrigatória." }),
  customFields: z.record(z.any()).optional(),
});

const newCustomerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  phone: z.string().min(10, "O telefone deve ter pelo menos 10 caracteres."),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;
type NewCustomerValues = z.infer<typeof newCustomerSchema>;

function CreateQuoteForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [isVersioning, setIsVersioning] = useState(false);
  const [baseQuote, setBaseQuote] = useState<Quote | null>(null);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      title: '',
      clientId: '',
      description: '',
      totalValue: 0,
      validUntil: addDays(new Date(), 7),
      customFields: {},
    },
  });

  const newCustomerForm = useForm<NewCustomerValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { name: '', phone: '' },
  });

  useEffect(() => {
    const templateId = searchParams.get('templateId');
    const versionOfId = searchParams.get('versionOf');

    const fetchTemplate = async () => {
        const templateRef = doc(db, 'quotes', templateId!);
        const templateSnap = await getDoc(templateRef);
        if(templateSnap.exists()) {
            const templateData = templateSnap.data() as Quote;
             form.reset({
                title: templateData.title,
                description: templateData.description,
                totalValue: templateData.totalValue,
                customFields: templateData.customFields || {},
                validUntil: addDays(new Date(), 7),
                clientId: '',
            });
            toast({ title: 'Modelo Carregado', description: `Modelo "${templateData.templateName}" preenchido. Selecione um cliente.`});
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: 'Modelo não encontrado.'});
        }
    }

    const fetchBaseQuote = async () => {
        setIsVersioning(true);
        const quoteRef = doc(db, 'quotes', versionOfId!);
        const quoteSnap = await getDoc(quoteRef);
        if (quoteSnap.exists()) {
            const data = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;
            setBaseQuote(data);
            form.reset({
                ...data,
                validUntil: addDays(new Date(), 7),
                customFields: Object.entries(data.customFields || {}).reduce((acc, [key, value]) => {
                    const fieldType = settings.quoteCustomFields?.find(f => f.id === key)?.type;
                    if (fieldType === 'date' && value && value.toDate) {
                        (acc as any)[key] = value.toDate();
                    } else {
                        (acc as any)[key] = value;
                    }
                    return acc;
                }, {}),
            });
            toast({ title: 'Criando Nova Versão', description: `Baseado na versão ${data.version} do orçamento.` });
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: 'Orçamento base para nova versão não encontrado.' });
        }
    }

    if (user) {
        if (versionOfId) {
            fetchBaseQuote().finally(() => setIsInitializing(false));
        } else if (templateId) {
            fetchTemplate().finally(() => setIsInitializing(false));
        } else {
            setIsInitializing(false);
        }
    }
  }, [searchParams, user, form, toast, settings.quoteCustomFields]);


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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);
  
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
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Cliente cadastrado." });
      form.setValue('clientId', docRef.id, { shouldValidate: true, shouldTouch: true });
      setIsNewClientDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao cadastrar o cliente." });
    }
  };

  const onSubmit = async (data: QuoteFormValues) => {
    if (!user) return;
    try {
      const selectedCustomer = customers.find(c => c.id === data.clientId);
      if (!selectedCustomer) throw new Error("Cliente não encontrado");

      const customFieldsData = { ...data.customFields };
      settings.quoteCustomFields?.forEach(field => {
            if (field.type === 'date' && customFieldsData[field.id]) {
                customFieldsData[field.id] = Timestamp.fromDate(new Date(customFieldsData[field.id]));
            }
       });

      const payload: Omit<Quote, 'id'> = {
        ...data,
        clientName: selectedCustomer.name,
        validUntil: Timestamp.fromDate(data.validUntil),
        customFields: customFieldsData,
        userId: user.uid,
        status: 'Pendente',
        createdAt: Timestamp.now(),
        isTemplate: false,
        version: 1,
      };

      if (isVersioning && baseQuote) {
        payload.originalQuoteId = baseQuote.originalQuoteId || baseQuote.id;
        payload.version = (baseQuote.version || 1) + 1;
      }
      
      const docRef = await addDoc(collection(db, 'quotes'), payload);

      if (!isVersioning) {
        await updateDoc(docRef, { originalQuoteId: docRef.id });
      }

      toast({ title: "Sucesso!", description: isVersioning ? "Nova versão do orçamento criada." : "Orçamento criado." });
      router.push('/dashboard/orcamentos');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: `Falha ao criar o orçamento: ${error.message}` });
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isInitializing) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle>{isVersioning ? 'Criar Nova Versão do Orçamento' : 'Detalhes do Orçamento'}</CardTitle>
            <CardDescription>
              {isVersioning ? `Criando uma nova versão para o orçamento de ${baseQuote?.clientName}. A versão anterior será mantida no histórico.` : 'Preencha os detalhes abaixo para criar uma nova proposta.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título do Orçamento *</FormLabel><FormControl><Input placeholder="Ex: Conserto da geladeira Brastemp" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Cliente *</FormLabel>
                    <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setIsNewClientDialogOpen(true)} disabled={isVersioning}>
                      <UserPlus className="mr-2 h-3.5 w-3.5" /> Novo Cliente
                    </Button>
                  </div>
                  <div className="relative" ref={dropdownRef}>
                    <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} onClick={() => setIsDropdownOpen(prev => !prev)} disabled={isVersioning}>
                      <span className='truncate'>
                        {field.value ? customers.find(c => c.id === field.value)?.name : "Selecione um cliente"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                        <div className="p-2">
                          <Input
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <ScrollArea className="h-48">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer) => (
                              <button
                                type="button"
                                key={customer.id}
                                className="flex items-center w-full text-left p-2 text-sm hover:bg-accent"
                                onClick={() => {
                                  field.onChange(customer.id);
                                  setIsDropdownOpen(false);
                                  setSearchTerm('');
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", field.value === customer.id ? "opacity-100" : "opacity-0")} />
                                <div>
                                  <p>{customer.name}</p>
                                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <p className="p-2 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                          )}
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}/>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição dos Serviços/Produtos *</FormLabel><FormControl><Textarea placeholder="Detalhe os itens do orçamento..." {...field} rows={5} /></FormControl><FormMessage /></FormItem>
              )}/>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField control={form.control} name="totalValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">R$</span>
                          <Input type="number" step="0.01" placeholder="250,00" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
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

               {settings.quoteCustomFields && settings.quoteCustomFields.length > 0 && (
                    <>
                        <Separator className="my-2" />
                        <h3 className="text-sm font-medium text-muted-foreground">Informações Adicionais</h3>
                        {settings.quoteCustomFields.map((customField) => (
                           <FormField
                                key={customField.id}
                                control={form.control}
                                name={`customFields.${customField.id}`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{customField.name}</FormLabel>
                                        <FormControl>
                                            {customField.type === 'date' ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(new Date(field.value), "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            ) : (
                                                <Input type={customField.type} {...field} value={field.value || ''} />
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </>
                )}

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

      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Cadastrar Novo Cliente</DialogTitle><DialogDescription>Preencha os detalhes para um cadastro rápido.</DialogDescription></DialogHeader>
            <Form {...newCustomerForm}>
              <form onSubmit={newCustomerForm.handleSubmit(onNewClientSubmit)} className="space-y-4">
                <FormField control={newCustomerForm.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome Completo *</FormLabel><FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={newCustomerForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Telefone *</FormLabel><FormControl><Input placeholder="Ex: (11) 99999-8888" {...field} /></FormControl><FormMessage /></FormItem> )}/>
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
    </>
  );
}

export default function CriarOrcamentoPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
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
                <CreateQuoteForm />
            </div>
        </Suspense>
    )
}

    