

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
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
import { Loader2, MoreHorizontal, UserPlus, Users, Search, CalendarIcon, Trash2, BookOpen, Check, X, ChevronsUpDown, Tag as TagIcon, Filter, DollarSign, Wrench } from 'lucide-react';
import { Customer } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerForm, CustomerFormValues } from '@/components/forms/customer-form';

export default function BaseDeClientesPage() {
  const { user, activeAccountId } = useAuth();
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
  
  useEffect(() => {
    if (!activeAccountId) return;
    setIsLoading(true);
    const q = query(collection(db, 'customers'), where('userId', '==', activeAccountId), orderBy('createdAt', 'desc'));

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
  }, [activeAccountId, toast]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
        const searchMatch = !searchTerm || (
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (customer.cpfCnpj && customer.cpfCnpj.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const tagsMatch = tagFilter.length === 0 || 
            tagFilter.every(tagId => Array.isArray(customer.tagIds) && customer.tagIds.includes(tagId));
        
        return searchMatch && tagsMatch;
    });
  }, [customers, searchTerm, tagFilter]);
  
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

  const handleUpdateCustomer = async (data: CustomerFormValues) => {
    if (!user || !editingCustomer) {
        toast({ variant: "destructive", title: "Erro", description: "Nenhum cliente selecionado para edição." });
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
          tagIds: data.tagId && data.tagId !== 'none' ? [data.tagId] : [],
          birthDate: data.birthDate ? Timestamp.fromDate(data.birthDate) : null,
          customFields: customFieldsData,
      };
      delete (payload as any).tagId;

      const customerRef = doc(db, 'customers', editingCustomer.id);
      const logEntry = {
          timestamp: Timestamp.now(),
          userEmail: user?.email || 'Sistema',
          description: 'Dados do cliente atualizados.',
      };
      await updateDoc(customerRef, { ...payload, activityLog: arrayUnion(logEntry) });
      toast({ title: "Sucesso!", description: "Cliente atualizado." });
      
      setIsDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error("Error updating document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: `Falha ao salvar as alterações. ${error instanceof Error ? error.message : ''}`
      });
    }
  };
  
  const getTagById = (id: string) => settings.tags?.find(t => t.id === id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Base de Clientes</h1>
        <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                <Link href="/dashboard/base-de-clientes/personalizar">
                    <Wrench className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Personalizar</span>
                </Link>
            </Button>
            <Button size="sm" className="h-8 gap-1" asChild>
                <Link href="/dashboard/base-de-clientes/criar">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Novo Cliente
                    </span>
                </Link>
            </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Atualize os detalhes do cliente abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
                <CustomerForm 
                    customer={editingCustomer} 
                    onSubmit={handleUpdateCustomer}
                    onCancel={() => setIsDialogOpen(false)}
                />
            </div>
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
                            <CommandList>
                                <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
                                <CommandGroup>
                                    {settings.tags?.map(tag => (
                                        <CommandItem
                                            key={tag.id}
                                            onSelect={() => {
                                                const newTagFilter = tagFilter.includes(tag.id)
                                                    ? tagFilter.filter(id => id !== tag.id)
                                                    : [...tagFilter, tag.id];
                                                setTagFilter(newTagFilter);
                                            }}
                                            className='cursor-pointer'
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", tagFilter.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                                            <Badge variant="outline" className={cn(tag.color)}>{tag.name}</Badge>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem onSelect={() => router.push('/dashboard/configuracoes')} className="cursor-pointer">
                                        <TagIcon className="mr-2 h-4 w-4" />
                                        <span>Gerenciar Etiquetas</span>
                                    </CommandItem>
                                    {tagFilter.length > 0 && (
                                        <CommandItem onSelect={() => setTagFilter([])} className="justify-center text-center cursor-pointer">
                                            Limpar filtros
                                        </CommandItem>
                                    )}
                                </CommandGroup>
                            </CommandList>
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
                  {searchTerm || tagFilter.length > 0 ? "Tente um termo de busca diferente." : "Comece adicionando seu primeiro cliente."}
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
                            {Array.isArray(customer.tagIds) && customer.tagIds.map(tagId => {
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

