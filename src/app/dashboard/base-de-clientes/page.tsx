
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, UserPlus, Users, Search, CalendarIcon, Trash2, BookOpen, Check, X, ChevronsUpDown, Tag as TagIcon, Filter } from 'lucide-react';
import { Customer } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

const customerFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  phone: z.string().refine(val => {
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  }, {
    message: 'O telefone deve conter entre 10 e 11 dígitos numéricos.'
  }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }).optional().or(z.literal('')),
  address: z.string().optional(),
  cpfCnpj: z.string().optional(),
  birthDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  tagIds: z.array(z.string()).optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function BaseDeClientesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      cpfCnpj: '',
      birthDate: null,
      notes: '',
      customFields: {},
      tagIds: [],
    },
  });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const customerList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Customer));
      setCustomers(customerList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching customers: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar os clientes. Verifique as regras de segurança do Firestore.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  useEffect(() => {
    if (isDialogOpen) {
      if (editingCustomer) {
        const defaultValues = {
            ...editingCustomer,
            birthDate: editingCustomer.birthDate ? editingCustomer.birthDate.toDate() : null,
            customFields: editingCustomer.customFields || {},
            tagIds: editingCustomer.tagIds || [],
        };
        form.reset(defaultValues);
      } else {
        form.reset({
          name: '', phone: '', email: '', address: '',
          cpfCnpj: '', birthDate: null, notes: '', customFields: {}, tagIds: []
        });
      }
    }
  }, [isDialogOpen, editingCustomer, form]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
        const searchMatch = !searchTerm || (
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (customer.cpfCnpj && customer.cpfCnpj.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const tagsMatch = tagFilter.length === 0 || 
            tagFilter.every(tagId => customer.tagIds?.includes(tagId));
        
        return searchMatch && tagsMatch;
    });
  }, [customers, searchTerm, tagFilter]);

  const handleAddNew = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleDelete = (customerId: string) => {
    setDeletingCustomerId(customerId);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingCustomerId) return;
    try {
      await deleteDoc(doc(db, 'customers', deletingCustomerId));
      toast({ title: "Sucesso!", description: "Cliente excluído." });
      setDeletingCustomerId(null);
      setIsAlertOpen(false);
    } catch (error) {
      console.error("Error deleting document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: "Falha ao excluir o cliente."
      });
    }
  };

  const onSubmit = async (data: CustomerFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado para gerenciar clientes." });
        return;
    }
    
    try {
       const customFieldsData = { ...data.customFields };
       settings.customerCustomFields?.forEach(field => {
            if (field.type === 'date' && customFieldsData[field.id]) {
                customFieldsData[field.id] = Timestamp.fromDate(new Date(customFieldsData[field.id]));
            }
       });

      const payload = {
          ...data,
          birthDate: data.birthDate ? Timestamp.fromDate(data.birthDate) : null,
          customFields: customFieldsData,
      };

      if (editingCustomer) {
        const customerRef = doc(db, 'customers', editingCustomer.id);
        await updateDoc(customerRef, payload);
        toast({ title: "Sucesso!", description: "Cliente atualizado." });
      } else {
        const q = query(collection(db, 'customers'), where('userId', '==', user.uid), where('phone', '==', data.phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente com este número de telefone." });
          return;
        }

        await addDoc(collection(db, 'customers'), {
          ...payload,
          userId: user.uid,
          createdAt: Timestamp.now(),
        });
        toast({ title: "Sucesso!", description: "Cliente cadastrado." });
      }
      setIsDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error("Error adding/updating document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: `Falha ao salvar o cliente. ${error instanceof Error ? error.message : ''}`
      });
    }
  };
  
  const getTagById = (id: string) => settings.tags?.find(t => t.id === id);


  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Base de Clientes</h1>
        <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
            <UserPlus className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Novo Cliente
            </span>
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Atualize os detalhes do cliente abaixo." : "Preencha os detalhes para adicionar um novo cliente à sua base."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl><Input placeholder="Ex: (11) 99999-8888" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input type="email" placeholder="Ex: maria.oliveira@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                
                 <FormField
                    control={form.control}
                    name="tagIds"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Etiquetas</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-full justify-between h-auto",
                                                !field.value?.length && "text-muted-foreground"
                                            )}
                                        >
                                            <div className="flex gap-1 flex-wrap">
                                                {field.value?.length > 0 ? (
                                                    field.value.map(tagId => {
                                                        const tag = getTagById(tagId);
                                                        return tag ? <Badge key={tag.id} variant="outline" className={cn('font-normal', tag.color)}>{tag.name}</Badge> : null;
                                                    })
                                                ) : (
                                                    "Selecione etiquetas"
                                                )}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar etiquetas..." />
                                        <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandList>
                                                {settings.tags?.map(tag => (
                                                    <CommandItem
                                                        key={tag.id}
                                                        onSelect={() => {
                                                            const currentTagIds = field.value || [];
                                                            const newTagIds = currentTagIds.includes(tag.id)
                                                                ? currentTagIds.filter(id => id !== tag.id)
                                                                : [...currentTagIds, tag.id];
                                                            field.onChange(newTagIds);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", field.value?.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                                                        <Badge variant="outline" className={cn('mr-2', tag.color)}>{tag.name}</Badge>
                                                    </CommandItem>
                                                ))}
                                            </CommandList>
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                             <FormMessage />
                        </FormItem>
                    )}
                 />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Textarea placeholder="Rua das Flores, 123, Bairro, Cidade - Estado" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="cpfCnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="birthDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Nascimento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
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
                 <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Informações adicionais sobre o cliente..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                {settings.customerCustomFields && settings.customerCustomFields.length > 0 && (
                    <>
                        <Separator className="my-2" />
                        <h3 className="text-sm font-medium text-muted-foreground">Informações Adicionais</h3>
                        {settings.customerCustomFields.map((customField) => (
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
                                                <Input type={customField.type} {...field} />
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}
                    </>
                )}


                <DialogFooter className='pt-4'>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingCustomer ? "Salvar Alterações" : "Salvar Cliente"}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>


      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes (CRM)</CardTitle>
          <CardDescription>Cadastre, pesquise e gerencie as informações dos seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-customer"
                placeholder="Buscar por nome, telefone, e-mail ou CPF/CNPJ..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                           <Filter className="mr-2 h-4 w-4" />
                           <div className='flex-1 text-left truncate'>
                            {tagFilter.length > 0 ? `Filtrando por ${tagFilter.length} etiqueta(s)` : 'Filtrar por etiquetas'}
                           </div>
                           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="end">
                         <Command>
                            <CommandInput placeholder="Buscar etiquetas..." />
                            <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
                            <CommandGroup>
                                <CommandList>
                                    {settings.tags?.map(tag => (
                                        <CommandItem
                                            key={tag.id}
                                            onSelect={() => {
                                                const newTagFilter = tagFilter.includes(tag.id)
                                                    ? tagFilter.filter(id => id !== tag.id)
                                                    : [...tagFilter, tag.id];
                                                setTagFilter(newTagFilter);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", tagFilter.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                                            <Badge variant="outline" className={cn(tag.color)}>{tag.name}</Badge>
                                        </CommandItem>
                                    ))}
                                </CommandList>
                            </CommandGroup>
                            {tagFilter.length > 0 && (
                                <CommandGroup>
                                    <CommandItem onSelect={() => setTagFilter([])} className="justify-center text-center">
                                        Limpar filtros
                                    </CommandItem>
                                </CommandGroup>
                            )}
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-10">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum cliente encontrado.</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || tagFilter.length > 0 ? "Tente um filtro ou termo de busca diferente." : "Comece adicionando seu primeiro cliente."}
                </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Etiquetas</TableHead>
                    <TableHead className="hidden md:table-cell">Contato</TableHead>
                    <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                    <TableCell>
                        <Link href={`/dashboard/base-de-clientes/${customer.id}`} className="font-medium hover:underline">{customer.name}</Link>
                        <div className="text-sm text-muted-foreground md:hidden">{customer.phone}</div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {customer.tagIds?.map(tagId => {
                                const tag = getTagById(tagId);
                                return tag ? <Badge key={tag.id} variant="outline" className={cn(tag.color)}>{tag.name}</Badge> : null;
                            })}
                        </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div>{customer.phone}</div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{customer.createdAt? format(customer.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                             <DropdownMenuItem onClick={() => router.push(`/dashboard/base-de-clientes/${customer.id}`)}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                Editar Cliente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(customer.id)}>
                               <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Cliente
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredCustomers.length}</strong> de <strong>{customers.length}</strong> clientes.
          </div>
        </CardFooter>
      </Card>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente e todos os seus dados associados.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCustomerId(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                    Sim, excluir
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}

    

    
