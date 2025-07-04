
'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, UserPlus, Users, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface CustomerData {
  name: string;
  phone: string;
  email: string;
  address: string;
  cpfCnpj: string;
  birthDate: string;
  notes: string;
}

interface Customer extends Omit<CustomerData, 'birthDate'> {
    id: string;
    createdAt: Timestamp;
    userId: string;
    birthDate?: Timestamp | null;
}

const initialFormState: CustomerData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  cpfCnpj: '',
  birthDate: '',
  notes: '',
};

export default function BaseDeClientesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCustomerData, setNewCustomerData] = useState<CustomerData>(initialFormState);

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

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return customers;
    }
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.cpfCnpj && customer.cpfCnpj.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCustomerData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado para criar um cliente." });
        return;
    }
    if (newCustomerData.name.length < 3 || newCustomerData.phone.length < 10) {
      toast({ variant: "destructive", title: "Campos Obrigatórios", description: "Nome e telefone são obrigatórios." });
      return;
    }
    setIsFormSubmitting(true);
    try {
      const q = query(collection(db, 'customers'), where('userId', '==', user.uid), where('phone', '==', newCustomerData.phone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente com este número de telefone." });
        setIsFormSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'customers'), {
        ...newCustomerData,
        birthDate: newCustomerData.birthDate ? Timestamp.fromDate(new Date(newCustomerData.birthDate)) : null,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Cliente cadastrado." });
      setNewCustomerData(initialFormState);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar cliente",
        description: "Falha ao salvar o cliente."
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
            <Button size="sm" className="h-8 gap-1" onClick={() => setNewCustomerData(initialFormState)}>
              <UserPlus className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Novo Cliente
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha os detalhes para adicionar um novo cliente à sua base.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" name="name" value={newCustomerData.name} onChange={handleInputChange} placeholder="Ex: Maria Oliveira" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input id="phone" name="phone" value={newCustomerData.phone} onChange={handleInputChange} placeholder="Ex: (11) 99999-8888" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" value={newCustomerData.email} onChange={handleInputChange} placeholder="Ex: maria.oliveira@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Textarea id="address" name="address" value={newCustomerData.address} onChange={handleInputChange} placeholder="Rua das Flores, 123, Bairro, Cidade - Estado" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                <Input id="cpfCnpj" name="cpfCnpj" value={newCustomerData.cpfCnpj} onChange={handleInputChange} placeholder="Opcional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input id="birthDate" name="birthDate" type="date" value={newCustomerData.birthDate} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" value={newCustomerData.notes} onChange={handleInputChange} placeholder="Informações adicionais sobre o cliente..." />
              </div>
              <DialogFooter className='pt-4'>
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isFormSubmitting}>
                      {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Cliente
                  </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes (CRM)</CardTitle>
          <CardDescription>Cadastre, pesquise e gerencie as informações dos seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="search-customer">Pesquisar Cliente</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-customer"
                placeholder="Buscar por nome, telefone, e-mail ou CPF/CNPJ..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                  {searchTerm ? "Tente um termo de busca diferente." : "Comece adicionando seu primeiro cliente."}
                </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Contato</TableHead>
                    <TableHead className="hidden lg:table-cell">CPF/CNPJ</TableHead>
                    <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                    <TableHead><span className="sr-only">Ações</span></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                    <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground md:hidden">{customer.phone}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div>{customer.phone}</div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{customer.cpfCnpj || 'N/A'}</TableCell>
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
          </div>
          )}
        </CardContent>
         <CardFooter>
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredCustomers.length}</strong> de <strong>{customers.length}</strong> clientes.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

    