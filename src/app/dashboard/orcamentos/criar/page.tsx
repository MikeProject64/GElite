
'use client';

import { Suspense, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, ChevronsUpDown, Check, UserPlus, DollarSign, ArrowLeft, FilePlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Customer, Quote } from '@/types';
import { CustomerForm, CustomerFormValues } from '@/components/forms/customer-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const quoteSchema = z.object({
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  clientId: z.string({ required_error: "Por favor, selecione um cliente." }).min(1, "Por favor, selecione um cliente."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  totalValue: z.coerce.number({
    errorMap: () => ({ message: "O valor total é obrigatório." })
  }).min(0.01, "O valor total deve ser maior que zero."),
  validUntil: z.date({ required_error: "A data de validade é obrigatória." }),
  customFields: z.record(z.any()).optional(),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
  onSuccess?: (quoteId: string) => void;
  onCancel?: () => void;
  baseQuoteId?: string; 
  template?: Quote | null; 
  clientId?: string; 
}

export function QuoteForm({ onSuccess, onCancel, baseQuoteId, template, clientId }: QuoteFormProps) {
    const { user, activeAccountId } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const { settings } = useSettings();
    
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isInitializing, setIsInitializing] = useState(true);
    const [baseQuote, setBaseQuote] = useState<Quote | null>(null);
  
    const isVersioning = !!baseQuoteId;
  
    const form = useForm<QuoteFormValues>({
      resolver: zodResolver(quoteSchema),
      defaultValues: {
        title: '', clientId: '', description: '', totalValue: 0,
        validUntil: addDays(new Date(), 7), customFields: {},
      },
    });
  
     useEffect(() => {
        if (!user) return;
        setIsInitializing(true);
    
        const loadTemplateData = (templateData: Quote) => {
            const customFieldsWithDate = Object.entries(templateData.customFields || {}).reduce((acc, [key, value]) => {
                const fieldType = settings.quoteCustomFields?.find(f => f.id === key)?.type;
                if (value && fieldType === 'date' && value.toDate) {
                    (acc as any)[key] = value.toDate();
                } else {
                    (acc as any)[key] = value;
                }
                return acc;
            }, {});

            form.reset({
                title: templateData.title,
                description: templateData.description,
                totalValue: templateData.totalValue,
                customFields: customFieldsWithDate,
                validUntil: templateData.validUntil ? templateData.validUntil.toDate() : addDays(new Date(), 7),
                clientId: clientId || '',
            });
            toast({ title: 'Modelo Carregado', description: `Modelo "${templateData.templateName}" preenchido. Selecione um cliente.`});
        }
    
        if (template) {
            loadTemplateData(template);
            setIsInitializing(false);
        } else if (clientId) {
            form.setValue('clientId', clientId, { shouldValidate: true });
            setIsInitializing(false);
        } else if (!baseQuoteId) {
            setIsInitializing(false);
        }
      }, [template, clientId, baseQuoteId, user, form, toast, settings.quoteCustomFields]);
    
      useEffect(() => {
        const fetchBaseQuote = async () => {
            if (!user || !baseQuoteId) {
                setIsInitializing(false);
                return;
            }
    
            const quoteRef = doc(db, 'quotes', baseQuoteId);
            const quoteSnap = await getDoc(quoteRef);
    
            if (quoteSnap.exists()) {
                const data = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;
                setBaseQuote(data);
                
                const customFieldsWithDate = Object.entries(data.customFields || {}).reduce((acc, [key, value]) => {
                    const fieldType = settings.quoteCustomFields?.find(f => f.id === key)?.type;
                    if (value && fieldType === 'date' && value.toDate) {
                        (acc as any)[key] = value.toDate();
                    } else {
                        (acc as any)[key] = value;
                    }
                    return acc;
                }, {});
    
                form.reset({
                    ...data,
                    validUntil: addDays(new Date(), 7),
                    customFields: customFieldsWithDate,
                });
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Orçamento base não encontrado.' });
                router.push('/dashboard/orcamentos');
            }
            setIsInitializing(false);
        };
        
        if (baseQuoteId) {
            fetchBaseQuote();
        }
      }, [baseQuoteId, user, settings.quoteCustomFields, form, toast, router]);
    
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
      
      const handleNewClientSubmit = async (data: CustomerFormValues) => {
        if (!user || !activeAccountId) return;
        try {
          const q = query(collection(db, 'customers'), where('userId', '==', activeAccountId), where('phone', '==', data.phone));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente com este telefone." });
            return;
          }

          const customFieldsData = { ...data.customFields };
           settings.customerCustomFields?.forEach(field => {
                if (field.type === 'date' && customFieldsData[field.id]) {
                    customFieldsData[field.id] = Timestamp.fromDate(new Date(customFieldsData[field.id]));
                }
           });
    
          const payload = {
            ...data,
            userId: activeAccountId,
              tagIds: data.tagId && data.tagId !== 'none' ? [data.tagId] : [],
              birthDate: data.birthDate ? Timestamp.fromDate(data.birthDate) : null,
              customFields: customFieldsData,
            createdAt: Timestamp.now(),
              activityLog: [{
                  timestamp: Timestamp.now(),
                  userEmail: user.email || 'Sistema',
                  description: 'Cliente cadastrado.',
                  entityName: data.name,
              }],
          };
          delete (payload as any).tagId;
    
          const docRef = await addDoc(collection(db, 'customers'), payload);
          toast({ title: "Sucesso!", description: "Cliente cadastrado." });
          form.setValue('clientId', docRef.id, { shouldValidate: true, shouldTouch: true });
          setIsNewClientDialogOpen(false);
        } catch (error) {
          toast({ variant: "destructive", title: "Erro", description: `Falha ao cadastrar o cliente. ${error instanceof Error ? error.message : ''}` });
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
                    const dateValue = customFieldsData[field.id];
                    if (dateValue && !(dateValue instanceof Timestamp)) {
                       customFieldsData[field.id] = Timestamp.fromDate(new Date(dateValue));
                    }
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
          if (onSuccess) {
            onSuccess(docRef.id);
          } else {
            router.push(`/dashboard/orcamentos/${docRef.id}`);
          }
        } catch (error: any) {
          toast({ variant: "destructive", title: "Erro", description: `Falha ao criar o orçamento: ${error.message}` });
        }
      };
    
      const filteredCustomers = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                   <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Título do Orçamento *</FormLabel><FormControl><Input placeholder="Ex: Conserto da geladeira Brastemp" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  
                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <FormLabel>Cliente *</FormLabel>
                        <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setIsNewClientDialogOpen(true)} disabled={isVersioning || !!clientId}>
                          <UserPlus className="mr-2 h-3.5 w-3.5" /> Novo Cliente
                        </Button>
                      </div>
                      <div className="relative">
                        <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} disabled={isVersioning || !!clientId}>
                                <span className='truncate'>
                                    {field.value ? customers.find(c => c.id === field.value)?.name : "Selecione um cliente"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command><CommandInput placeholder="Buscar cliente..." value={searchTerm} onValueChange={setSearchTerm} /><CommandList><CommandEmpty>Nenhum cliente encontrado.</CommandEmpty><CommandGroup><ScrollArea className="h-48">{filteredCustomers.length > 0 ? (filteredCustomers.map((customer) => (<CommandItem key={customer.id} value={customer.id} onSelect={(currentValue) => {form.setValue('clientId', currentValue === field.value ? '' : currentValue, { shouldValidate: true }); setIsDropdownOpen(false);}}><Check className={cn("mr-2 h-4 w-4", field.value === customer.id ? "opacity-100" : "opacity-0")} /><div><p>{customer.name}</p><p className="text-xs text-muted-foreground">{customer.phone}</p></div></CommandItem>))) : (<p className="p-2 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>)}</ScrollArea></CommandGroup></CommandList></Command>
                            </PopoverContent>
                        </Popover>
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
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input type="number" step="0.01" placeholder="250,00" className="pl-8" {...field} />
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
    
                   {settings.quoteCustomFields?.map((customField) => (
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
                                        ) : customField.type === 'currency' ? (
                                             <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" step="0.01" className="pl-8" {...field} onChange={e => field.onChange(Number(e.target.value))} value={field.value ?? ''} />
                                            </div>
                                        ) : (
                                            <Input type={customField.type} {...field} value={field.value || ''} />
                                        )}
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
    
                  <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="ghost" onClick={onCancel ? onCancel : () => router.back()}>Cancelar</Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Salvar Orçamento
                      </Button>
                  </div>
                </form>
            </Form>
    
          <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                <DialogDescription>Preencha os detalhes para um cadastro completo.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto p-1">
                <CustomerForm onSubmit={handleNewClientSubmit} onCancel={() => setIsNewClientDialogOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
}

function CreateQuotePageContent() {
    const searchParams = useSearchParams();
    const isVersioning = !!searchParams.get('versionOf');
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/dashboard/orcamentos">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Voltar</span>
                        </Link>
                    </Button>
                    <div className='flex items-center gap-2'>
                       <FilePlus className="h-5 w-5" />
                       <h1 className="text-xl font-semibold tracking-tight">
                           {isVersioning ? 'Criar Nova Versão do Orçamento' : 'Criar Novo Orçamento'}
                       </h1>
                    </div>
                </div>
                <CardDescription>
                    {isVersioning 
                        ? 'Crie uma nova versão do orçamento. A versão anterior será mantida no histórico.'
                        : 'Preencha os detalhes abaixo para criar uma nova proposta comercial.'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                <QuoteForm
                    baseQuoteId={searchParams.get('versionOf') || undefined}
                    clientId={searchParams.get('clientId') || undefined}
                />
            </CardContent>
        </Card>
    )
}

export default function CriarOrcamentoPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <div className="max-w-4xl mx-auto">
                <CreateQuotePageContent />
            </div>
        </Suspense>
    );
}
