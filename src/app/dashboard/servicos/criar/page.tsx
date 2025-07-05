
'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus, CalendarIcon, ChevronsUpDown, Check, FilePlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Customer, Collaborator, ServiceOrder } from '@/types';

// Schemas
const serviceOrderSchema = z.object({
  clientId: z.string({ required_error: "Por favor, selecione um cliente." }).min(1, "Por favor, selecione um cliente."),
  serviceType: z.string().min(1, "O serviço é obrigatório."),
  problemDescription: z.string().min(1, "A descrição do problema é obrigatória."),
  collaboratorId: z.string({ required_error: "Por favor, selecione um colaborador." }).min(1, "Por favor, selecione um colaborador."),
  totalValue: z.coerce.number().min(0, "O valor não pode ser negativo."),
  status: z.string({ required_error: "O status é obrigatório." }),
  dueDate: z.date({ required_error: "A data de vencimento é obrigatória." }),
  customFields: z.record(z.any()).optional(),
});

const newCustomerSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  phone: z.string().refine(val => {
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  }, {
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
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);

  const form = useForm<ServiceOrderValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: {
      clientId: '',
      serviceType: '',
      problemDescription: '',
      collaboratorId: '',
      totalValue: 0,
      status: settings.serviceStatuses?.[0] || 'Pendente',
      dueDate: new Date(),
      customFields: {},
    },
  });

  useEffect(() => {
    const templateId = searchParams.get('templateId');
    const fetchTemplate = async () => {
        if (!templateId) {
            setIsInitializing(false);
            return;
        }

        const templateRef = doc(db, 'serviceOrders', templateId);
        const templateSnap = await getDoc(templateRef);
        if(templateSnap.exists()) {
            const templateData = templateSnap.data() as ServiceOrder;
             form.reset({
                ...form.getValues(), // keep client id if already selected
                serviceType: templateData.serviceType,
                problemDescription: templateData.problemDescription,
                totalValue: templateData.totalValue,
                collaboratorId: templateData.collaboratorId,
                status: templateData.status,
                dueDate: templateData.dueDate.toDate(),
                customFields: templateData.customFields || {},
            });
            toast({ title: 'Modelo Carregado', description: `Modelo "${templateData.templateName}" preenchido.`});
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: 'Modelo não encontrado.'});
        }
        setIsInitializing(false);
    }
    fetchTemplate();
  }, [searchParams, form, toast]);


  const newCustomerForm = useForm<NewCustomerValues>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  // Fetch Customers
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCustomers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch Collaborators
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'collaborators'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCollaborators(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator)));
    });
    return () => unsubscribe();
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [customerDropdownRef]);

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

      await addDoc(collection(db, 'serviceOrders'), {
        ...data,
        clientName: selectedCustomer.name,
        collaboratorName: selectedCollaborator.name,
        dueDate: Timestamp.fromDate(data.dueDate),
        customFields: customFieldsData,
        userId: user.uid,
        createdAt: Timestamp.now(),
        completedAt: data.status === 'Concluída' ? Timestamp.now() : null,
        attachments: [],
        isTemplate: false,
        activityLog: [{
            timestamp: Timestamp.now(),
            userEmail: user?.email || 'Sistema',
            description: 'Ordem de Serviço criada.'
        }],
      });
      toast({ title: "Sucesso!", description: "Ordem de serviço criada." });
      router.push('/dashboard/servicos');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: `Falha ao criar a ordem de serviço: ${error.message}` });
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );
  
  const getSkillTagById = (id: string) => settings.skillTags?.find(t => t.id === id);

  const filteredCollaborators = useMemo(() => {
    if (requiredSkills.length === 0) {
        return collaborators;
    }
    return collaborators.filter(c => 
        c.type === 'collaborator' && requiredSkills.every(skillId => c.skillIds?.includes(skillId))
    );
  }, [collaborators, requiredSkills]);
  
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
            <CardTitle>Detalhes da Ordem de Serviço</CardTitle>
            <CardDescription>Preencha os detalhes abaixo para criar uma nova ordem de serviço.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onServiceOrderSubmit)} className="space-y-6">
               <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <FormLabel>Cliente *</FormLabel>
                    <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setIsNewClientDialogOpen(true)}>
                      <UserPlus className="mr-2 h-3.5 w-3.5" /> Novo Cliente
                    </Button>
                  </div>
                  <div className="relative" ref={customerDropdownRef}>
                    <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} onClick={() => setIsCustomerDropdownOpen(prev => !prev)}>
                      <span className='truncate'>
                        {field.value ? customers.find(c => c.id === field.value)?.name : "Selecione um cliente"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {isCustomerDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                        <div className="p-2">
                          <Input
                            placeholder="Buscar cliente..."
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
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
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchTerm('');
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
              <FormField control={form.control} name="serviceType" render={({ field }) => (
                <FormItem><FormLabel>Serviço *</FormLabel><FormControl><Input placeholder="Ex: Manutenção de Ar Condicionado" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="problemDescription" render={({ field }) => (
                <FormItem><FormLabel>Descrição do Problema *</FormLabel><FormControl><Textarea placeholder="Detalhe o problema relatado pelo cliente..." {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormItem>
                  <FormLabel>Habilidades Necessárias</FormLabel>
                   <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                    "w-full justify-between h-auto",
                                    !requiredSkills.length && "text-muted-foreground"
                                )}
                            >
                                <div className="flex gap-1 flex-wrap">
                                    {requiredSkills.length > 0 ? (
                                        requiredSkills.map(tagId => {
                                            const tag = getSkillTagById(tagId);
                                            return tag ? <Badge key={tag.id} variant="outline" className={cn('font-normal', tag.color)}>{tag.name}</Badge> : null;
                                        })
                                    ) : (
                                        "Filtrar por habilidade..."
                                    )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar habilidades..." />
                                 <CommandList>
                                    <CommandEmpty>Nenhuma habilidade encontrada.</CommandEmpty>
                                    <CommandGroup>
                                        {settings.skillTags?.map(tag => (
                                            <CommandItem
                                                key={tag.id}
                                                onSelect={() => {
                                                    const newSkillIds = requiredSkills.includes(tag.id)
                                                        ? requiredSkills.filter(id => id !== tag.id)
                                                        : [...requiredSkills, tag.id];
                                                    setRequiredSkills(newSkillIds);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", requiredSkills.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                                                <Badge variant="outline" className={cn('mr-2', tag.color)}>{tag.name}</Badge>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
              </FormItem>
               <FormField control={form.control} name="collaboratorId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Colaborador / Setor *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um colaborador" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {requiredSkills.length > 0 ? (
                         filteredCollaborators.length > 0 ? (
                            filteredCollaborators.map(collaborator => (
                                <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.name}</SelectItem>
                            ))
                         ) : (
                            <div className='p-2 text-center text-sm text-muted-foreground'>Nenhum colaborador com as habilidades selecionadas.</div>
                         )
                      ) : (
                        collaborators.map(collaborator => (
                            <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status inicial" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {settings.serviceStatuses?.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>

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
                  <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/servicos')}>Cancelar</Button>
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
                        Criar Nova Ordem de Serviço
                    </h1>
                </div>
                <CreateServiceOrderForm />
            </div>
        </Suspense>
    )
}
