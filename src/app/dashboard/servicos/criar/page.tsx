

'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus, CalendarIcon, ChevronsUpDown, Check, FilePlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Customer, Collaborator, ServiceOrder, ServiceOrderPriority } from '@/types';


// Schemas
const serviceOrderSchema = z.object({
  clientId: z.string({ required_error: "Por favor, selecione um cliente." }).min(1, "Por favor, selecione um cliente."),
  serviceType: z.string().min(1, "O serviço é obrigatório."),
  problemDescription: z.string().min(1, "A descrição do problema é obrigatória."),
  collaboratorId: z.string({ required_error: "Por favor, selecione um colaborador." }).min(1, "Por favor, selecione um colaborador."),
  totalValue: z.coerce.number().min(0, "O valor não pode ser negativo."),
  status: z.string({ required_error: "O status é obrigatório." }),
  priority: z.enum(['baixa', 'media', 'alta']).default('media'),
  dueDate: z.date({ required_error: "A data de vencimento é obrigatória." }),
  customFields: z.record(z.any()).optional(),
});

const newCustomerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  phone: z.string().refine(val => val.replace(/\D/g, '').length >= 10, {
    message: "O telefone deve conter entre 10 e 11 dígitos numéricos."
  }),
});

type ServiceOrderValues = z.infer<typeof serviceOrderSchema>;
type NewCustomerValues = z.infer<typeof newCustomerSchema>;

function CreateServiceOrderForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activeOrders, setActiveOrders] = useState<ServiceOrder[]>([]);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isVersioning, setIsVersioning] = useState(false);
  const [baseOrder, setBaseOrder] = useState<ServiceOrder | null>(null);

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isCollaboratorDropdownOpen, setIsCollaboratorDropdownOpen] = useState(false);
  const [collaboratorSearchTerm, setCollaboratorSearchTerm] = useState('');
  const collaboratorDropdownRef = useRef<HTMLDivElement>(null);

  const form = useForm<ServiceOrderValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      clientId: '',
      serviceType: '',
      problemDescription: '',
      collaboratorId: '',
      totalValue: 0,
      status: settings.serviceStatuses?.[0]?.name || 'Pendente',
      priority: 'media',
      dueDate: new Date(),
      customFields: {},
    },
  });

  const newCustomerForm = useForm<NewCustomerValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { name: '', phone: '' },
  });
  
  const collaboratorsWithTaskCount = useMemo(() => {
    const activeStatuses = settings.serviceStatuses?.filter(s => s.name !== 'Concluída' && s.name !== 'Cancelada').map(s => s.name) || ['Pendente', 'Em Andamento'];
    
    return collaborators.map(c => {
        const count = activeOrders.filter(o => o.collaboratorId === c.id && activeStatuses.includes(o.status)).length;
        return { ...c, activeTaskCount: count };
    });
  }, [collaborators, activeOrders, settings.serviceStatuses]);
  
  const filteredCollaborators = useMemo(() => 
    collaboratorsWithTaskCount.filter(c => 
      c.name.toLowerCase().includes(collaboratorSearchTerm.toLowerCase())
    ), [collaboratorsWithTaskCount, collaboratorSearchTerm]);


  useEffect(() => {
    if (!user) return;
    
    const templateId = searchParams.get('templateId');
    const versionOfId = searchParams.get('versionOf');
    const clientIdParam = searchParams.get('clientId');
    setIsVersioning(!!versionOfId);

    const initializeForm = async () => {
        if (versionOfId) {
            const orderRef = doc(db, 'serviceOrders', versionOfId);
            const orderSnap = await getDoc(orderRef);
            if (orderSnap.exists()) {
                const data = { id: orderSnap.id, ...orderSnap.data() } as ServiceOrder;
                setBaseOrder(data);
                const customFieldsWithDate = Object.entries(data.customFields || {}).reduce((acc, [key, value]) => {
                    const fieldType = settings.serviceOrderCustomFields?.find(f => f.id === key)?.type;
                    if (fieldType === 'date' && value && value.toDate) {
                        (acc as any)[key] = value.toDate();
                    } else {
                        (acc as any)[key] = value;
                    }
                    return acc;
                }, {});

                form.reset({
                    ...data,
                    dueDate: data.dueDate.toDate(),
                    customFields: customFieldsWithDate,
                });
                toast({ title: 'Criando Nova Versão', description: `Baseado na versão ${data.version || 1} da OS.` });
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Ordem de serviço base não encontrada.' });
                router.push('/dashboard/servicos');
            }
        } else if (templateId) {
            const templateRef = doc(db, 'serviceOrders', templateId);
            const templateSnap = await getDoc(templateRef);
            if(templateSnap.exists()) {
                const templateData = templateSnap.data() as ServiceOrder;
                form.reset({
                    ...form.getValues(),
                    serviceType: templateData.serviceType,
                    problemDescription: templateData.problemDescription,
                    totalValue: templateData.totalValue,
                    collaboratorId: templateData.collaboratorId,
                    status: templateData.status,
                    priority: templateData.priority || 'media',
                    dueDate: templateData.dueDate.toDate(),
                    customFields: templateData.customFields || {},
                });
                toast({ title: 'Modelo Carregado', description: `Modelo "${templateData.templateName}" preenchido.`});
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Modelo não encontrado.'});
            }
        } else if (clientIdParam) {
            form.setValue('clientId', clientIdParam, { shouldValidate: true });
        }
        setIsInitializing(false);
    };

    initializeForm();
  }, [searchParams, user, form, toast, router, settings.serviceOrderCustomFields]);


  // Fetch Customers
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCustomers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Collaborators and Active Orders
  useEffect(() => {
    if (!user) return;
    const qCollab = query(collection(db, 'collaborators'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubCollab = onSnapshot(qCollab, (querySnapshot) => {
      setCollaborators(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator)));
    });

    const qOrders = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setActiveOrders(snapshot.docs.map(doc => doc.data() as ServiceOrder));
    });

    return () => {
      unsubCollab();
      unsubOrders();
    };
  }, [user]);
  
  useEffect(() => {
    if(!isNewClientDialogOpen) {
      newCustomerForm.reset();
    }
  }, [isNewClientDialogOpen, newCustomerForm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (collaboratorDropdownRef.current && !collaboratorDropdownRef.current.contains(event.target as Node)) {
        setIsCollaboratorDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
  
  const onServiceOrderSubmit = async (data: ServiceOrderValues) => {
    if (!user) return;

    try {
      const selectedCustomer = customers.find(c => c.id === data.clientId);
      if (!selectedCustomer) throw new Error("Cliente não encontrado");

      const selectedCollaborator = collaborators.find(m => m.id === data.collaboratorId);
      if (!selectedCollaborator) throw new Error("Colaborador não encontrado");

      const customFieldsData = { ...data.customFields };
      settings.serviceOrderCustomFields?.forEach(field => {
            if (field.type === 'date' && customFieldsData[field.id]) {
                customFieldsData[field.id] = Timestamp.fromDate(new Date(customFieldsData[field.id]));
            }
       });
       
       const payload: Omit<ServiceOrder, 'id'> = {
        ...data,
        clientName: selectedCustomer.name,
        collaboratorName: selectedCollaborator.name,
        dueDate: Timestamp.fromDate(data.dueDate),
        customFields: customFieldsData,
        completedAt: data.status === 'Concluída' ? Timestamp.now() : null,
        userId: user.uid,
        createdAt: Timestamp.now(),
        attachments: [],
        isTemplate: false,
        activityLog: [],
        version: 1,
      };

      if (isVersioning && baseOrder) {
        payload.originalServiceOrderId = baseOrder.originalServiceOrderId || baseOrder.id;
        payload.version = (baseOrder.version || 1) + 1;
        payload.attachments = baseOrder.attachments; // Carry over attachments
        payload.activityLog = [
            {
                timestamp: Timestamp.now(),
                userEmail: user?.email || 'Sistema',
                description: `Nova versão (v${payload.version}) criada a partir da v${baseOrder.version || 1}.`
            }
        ]
      } else {
        payload.activityLog = [{
            timestamp: Timestamp.now(),
            userEmail: user?.email || 'Sistema',
            description: 'Ordem de Serviço criada.'
        }];
      }
      
      const docRef = await addDoc(collection(db, 'serviceOrders'), payload);

      if (!isVersioning) {
        await updateDoc(docRef, { originalServiceOrderId: docRef.id });
      }

      toast({ title: "Sucesso!", description: isVersioning ? "Nova versão da OS criada." : "Ordem de serviço criada." });
      router.push('/dashboard/servicos');

    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: `Falha ao salvar a ordem de serviço: ${error.message}` });
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.toLowerCase().includes(customerSearchTerm.toLowerCase()))
  );
  
  if (isInitializing) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  const clientIdFromUrl = searchParams.get('clientId');

  return (
    <>
      <Card>
        <CardHeader>
            <CardTitle>{isVersioning ? 'Criar Nova Versão da OS' : 'Detalhes da Ordem de Serviço'}</CardTitle>
            <CardDescription>{isVersioning ? `Criando uma nova versão para a OS de ${baseOrder?.clientName}. A versão anterior será mantida no histórico.` : 'Preencha os detalhes abaixo para criar uma nova ordem de serviço.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onServiceOrderSubmit)} className="space-y-6">
               <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Cliente *</FormLabel>
                    <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setIsNewClientDialogOpen(true)} disabled={isVersioning || !!clientIdFromUrl}>
                      <UserPlus className="mr-2 h-3.5 w-3.5" /> Novo Cliente
                    </Button>
                  </div>
                  <Popover open={isCustomerDropdownOpen} onOpenChange={setIsCustomerDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} disabled={isVersioning || !!clientIdFromUrl}>
                        <span className='truncate'>
                          {field.value ? customers.find(c => c.id === field.value)?.name : "Selecione um cliente"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." onValueChange={setCustomerSearchTerm} />
                        <CommandList>
                           <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                           <CommandGroup>
                             <ScrollArea className="h-48">
                                {filteredCustomers.map((customer) => (
                                <CommandItem key={customer.id} value={`${customer.name} ${customer.phone}`} onSelect={() => {
                                  field.onChange(customer.id);
                                  setIsCustomerDropdownOpen(false);
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", field.value === customer.id ? "opacity-100" : "opacity-0")} />
                                  <div>
                                    <p>{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                                  </div>
                                </CommandItem>
                                ))}
                              </ScrollArea>
                           </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem><FormLabel>Serviço *</FormLabel><FormControl><Input placeholder="Ex: Manutenção de Ar Condicionado" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="problemDescription" render={({ field }) => (
                <FormItem><FormLabel>Descrição do Problema *</FormLabel><FormControl><Textarea placeholder="Detalhe o problema relatado pelo cliente..." {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="collaboratorId" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Colaborador / Setor *</FormLabel>
                   <Popover open={isCollaboratorDropdownOpen} onOpenChange={setIsCollaboratorDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                        <span className='truncate'>
                          {field.value ? collaborators.find(c => c.id === field.value)?.name : "Selecione um responsável"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar..." onValueChange={setCollaboratorSearchTerm} />
                        <CommandList>
                           <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                           <CommandGroup>
                             <ScrollArea className="h-48">
                                {filteredCollaborators.map((c) => (
                                <CommandItem key={c.id} value={c.name} onSelect={() => {
                                  field.onChange(c.id);
                                  setIsCollaboratorDropdownOpen(false);
                                }}>
                                  <Check className={cn("mr-2 h-4 w-4", field.value === c.id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex justify-between w-full">
                                    <span>{c.name}</span>
                                    <span className="text-muted-foreground text-xs">({c.activeTaskCount} {c.activeTaskCount === 1 ? 'ativa' : 'ativas'})</span>
                                  </div>
                                </CommandItem>
                                ))}
                              </ScrollArea>
                           </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
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
              <FormField control={form.control} name="dueDate" render={({ field }) => (
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status inicial" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {settings.serviceStatuses?.map(status => (
                            <SelectItem key={status.id} value={status.name}>{status.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Prioridade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Defina a prioridade" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}/>
              </div>

                {settings.serviceOrderCustomFields && settings.serviceOrderCustomFields.length > 0 && (
                    <>
                        <Separator className="my-2" />
                        <h3 className="text-sm font-medium text-muted-foreground">Informações Adicionais</h3>
                        {settings.serviceOrderCustomFields.map((customField) => (
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
                  <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Ordem de Serviço
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


export default function CriarServicoPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/dashboard/servicos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
                    </Button>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
                        <FilePlus className='h-5 w-5' />
                        <CreateServiceOrderTitle />
                    </h1>
                </div>
                <CreateServiceOrderForm />
            </div>
        </Suspense>
    )
}

function CreateServiceOrderTitle() {
    const searchParams = useSearchParams();
    const isVersioning = !!searchParams.get('versionOf');
    return <>{isVersioning ? 'Criar Nova Versão da OS' : 'Criar Nova Ordem de Serviço'}</>;
}
