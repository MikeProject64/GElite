
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, UserPlus, Users, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const customerSchema = z.object({
  name: z.string().min(3, { message: 'O nome do cliente é obrigatório.' }),
  phone: z.string().min(10, { message: 'O telefone é obrigatório (mínimo 10 dígitos).' }),
  email: z.string().email({ message: 'Insira um e-mail válido.' }).optional().or(z.literal('')),
  address: z.string().optional(),
  cpfCnpj: z.string().optional(),
  birthDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface Customer extends Omit<CustomerFormValues, 'birthDate'> {
    id: string;
    createdAt: Timestamp;
    userId: string;
    birthDate?: Timestamp | null;
}

export default function BaseDeClientesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
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
        let description = "Não foi possível carregar os clientes. Verifique suas regras de segurança do Firestore.";
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            description = "A consulta ao banco de dados requer um índice. Verifique o console de depuração do navegador para obter o link para criar o índice.";
        }
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: description,
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const onSubmit = async (values: CustomerFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado para criar um cliente." });
        return;
    }
    setIsFormSubmitting(true);
    try {
      const q = query(collection(db, 'customers'), where('userId', '==', user.uid), where('phone', '==', values.phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente cadastrado com este número de telefone." });
        setIsFormSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'customers'), {
        ...values,
        birthDate: values.birthDate ? Timestamp.fromDate(values.birthDate) : null,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Cliente cadastrado." });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: "Falha ao salvar o cliente. Verifique as regras de segurança do Firestore."
      });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Base de Clientes</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Novo Cliente
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha os detalhes para adicionar um novo cliente à sua base.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input placeholder="Ex: (11) 99999-8888" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input placeholder="Ex: maria.oliveira@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Textarea placeholder="Rua das Flores, 123, Bairro, Cidade - Estado" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="cpfCnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="birthDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Nascimento</FormLabel>
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
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Informações adicionais sobre o cliente..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isFormSubmitting}>
                        {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Cliente
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes (CRM)</CardTitle>
          <CardDescription>Cadastre e gerencie as informações dos seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-10">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum cliente cadastrado.</h3>
                <p className="text-sm text-muted-foreground">Comece adicionando seu primeiro cliente.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="hidden md:table-cell">Data de Cadastro</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-muted-foreground md:hidden">{customer.phone}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>{customer.phone}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(customer.createdAt.seconds * 1000).toLocaleDateString()}</TableCell>
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
                        <DropdownMenuItem onClick={() => toast({ title: "Em breve", description: "A visualização de detalhes do cliente será implementada." })}>
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast({ title: "Em breve", description: "A edição de clientes será implementada." })}>
                          Editar Cliente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{customers.length}</strong> de <strong>{customers.length}</strong> clientes.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
