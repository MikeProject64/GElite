
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';


interface ServiceOrderData {
  clientId: string;
  serviceType: string;
  problemDescription: string;
  technician: string;
  status: 'Pendente' | 'Em Andamento' | 'Aguardando Peça' | 'Concluída' | 'Cancelada';
  dueDate: string;
}

interface NewCustomerData {
  name: string;
  phone: string;
  email: string;
  address: string;
  cpfCnpj: string;
  birthDate: string;
  notes: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

const initialServiceOrderState: ServiceOrderData = {
  clientId: '',
  serviceType: '',
  problemDescription: '',
  technician: '',
  status: 'Pendente',
  dueDate: '',
};

const initialNewCustomerState: NewCustomerData = {
    name: '', phone: '', email: '', address: '',
    cpfCnpj: '', birthDate: '', notes: '',
};

export default function CriarOrdemDeServicoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [isNewClientSubmitting, setIsNewClientSubmitting] = useState(false);

  const [serviceOrderData, setServiceOrderData] = useState<ServiceOrderData>(initialServiceOrderState);
  const [newCustomerData, setNewCustomerData] = useState<NewCustomerData>(initialNewCustomerState);

  useEffect(() => {
    if (!user) return;
    const qCustomers = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribeCustomers = onSnapshot(qCustomers, (querySnapshot) => {
      const customerList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customerList);
    }, (error) => {
        console.error("Error fetching customers: ", error);
        toast({ variant: "destructive", title: "Erro ao buscar clientes", description: "Não foi possível carregar a lista de clientes." });
    });
    return () => unsubscribeCustomers();
  }, [user, toast]);

  const handleServiceOrderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setServiceOrderData(prev => ({...prev, [name]: value}));
  }

  const handleSelectChange = (name: keyof ServiceOrderData, value: string) => {
     setServiceOrderData(prev => ({...prev, [name]: value}));
  }

  const handleNewCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCustomerData(prev => ({ ...prev, [name]: value }));
  };

  const onNewClientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
     if (newCustomerData.name.length < 3 || newCustomerData.phone.length < 10) {
      toast({ variant: "destructive", title: "Campos Obrigatórios", description: "Nome e telefone são obrigatórios." });
      return;
    }
    setIsNewClientSubmitting(true);
    try {
      const q = query(collection(db, 'customers'), where('userId', '==', user.uid), where('phone', '==', newCustomerData.phone));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente com este telefone." });
        setIsNewClientSubmitting(false);
        return;
      }
      const docRef = await addDoc(collection(db, 'customers'), {
        ...newCustomerData,
        birthDate: newCustomerData.birthDate ? Timestamp.fromDate(new Date(newCustomerData.birthDate)) : null,
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Cliente cadastrado." });
      setServiceOrderData(prev => ({ ...prev, clientId: docRef.id }));
      setNewCustomerData(initialNewCustomerState);
      setIsNewClientDialogOpen(false);
    } catch (error) {
      console.error("Error adding client: ", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao cadastrar o cliente." });
    } finally {
      setIsNewClientSubmitting(false);
    }
  };
  
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }

    const { clientId, serviceType, problemDescription, technician, dueDate } = serviceOrderData;
    if (!clientId || !serviceType || !problemDescription || !technician || !dueDate) {
         toast({ variant: "destructive", title: "Campos obrigatórios", description: "Por favor, preencha todos os campos obrigatórios." });
        return;
    }

    setIsFormSubmitting(true);
    try {
      const selectedCustomer = customers.find(c => c.id === clientId);
      if (!selectedCustomer) {
        toast({ variant: "destructive", title: "Erro", description: "Cliente selecionado não encontrado." });
        setIsFormSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'serviceOrders'), {
        ...serviceOrderData,
        clientName: selectedCustomer.name,
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        userId: user.uid,
        createdAt: Timestamp.now(),
      });
      toast({ title: "Sucesso!", description: "Ordem de serviço criada." });
      router.push('/dashboard/servicos');
    } catch (error: any) {
      console.error("Error adding document: ", error);
      toast({ variant: "destructive", title: "Erro ao criar ordem", description: "Falha ao criar a ordem de serviço." });
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
            <form onSubmit={onSubmit} className="space-y-6">
                <div className='space-y-2'>
                  <div className="flex items-center gap-4">
                    <Label>Cliente *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => setIsNewClientDialogOpen(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Novo Cliente</span>
                    </Button>
                  </div>
                   <Select
                    value={serviceOrderData.clientId}
                    onValueChange={(value) => handleSelectChange('clientId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente existente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 && <div className='p-4 text-sm text-muted-foreground'>Nenhum cliente cadastrado.</div>}
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='serviceType'>Tipo de Serviço *</Label>
                    <Input id='serviceType' name='serviceType' value={serviceOrderData.serviceType} onChange={handleServiceOrderChange} placeholder="Ex: Manutenção de Ar Condicionado" required />
                </div>
                 <div className='space-y-2'>
                    <Label htmlFor='problemDescription'>Descrição do Problema *</Label>
                    <Textarea id='problemDescription' name='problemDescription' value={serviceOrderData.problemDescription} onChange={handleServiceOrderChange} placeholder="Detalhe o problema relatado pelo cliente..." required />
                 </div>
                 <div className='space-y-2'>
                    <Label htmlFor='technician'>Técnico Responsável *</Label>
                    <Input id='technician' name='technician' value={serviceOrderData.technician} onChange={handleServiceOrderChange} placeholder="Ex: Carlos Pereira" required />
                 </div>
                 <div className='space-y-2'>
                    <Label htmlFor='dueDate'>Data de Vencimento *</Label>
                    <Input id='dueDate' name='dueDate' type='date' value={serviceOrderData.dueDate} onChange={handleServiceOrderChange} required />
                 </div>
                 <div className='space-y-2'>
                    <Label>Status *</Label>
                    <Select value={serviceOrderData.status} onValueChange={(value) => handleSelectChange('status', value as ServiceOrderData['status'])} required>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o status inicial" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                            <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                            <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                            <SelectItem value="Concluída">Concluída</SelectItem>
                            <SelectItem value="Cancelada">Cancelada</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/servicos')}>Cancelar</Button>
                    <Button type="submit" disabled={isFormSubmitting}>
                        {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Ordem de Serviço
                    </Button>
                </div>
              </form>
        </CardContent>
      </Card>

      <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                <DialogDescription>
                    Preencha os detalhes para adicionar um novo cliente. Nome e telefone são obrigatórios.
                </DialogDescription>
            </DialogHeader>
            <form id="new-client-form" onSubmit={onNewClientSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                 <div className="space-y-2">
                    <Label htmlFor="new-name">Nome Completo *</Label>
                    <Input id="new-name" name="name" value={newCustomerData.name} onChange={handleNewCustomerChange} placeholder="Ex: Maria Oliveira" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-phone">Telefone *</Label>
                    <Input id="new-phone" name="phone" value={newCustomerData.phone} onChange={handleNewCustomerChange} placeholder="Ex: (11) 99999-8888" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-email">E-mail (Opcional)</Label>
                    <Input id="new-email" name="email" type="email" value={newCustomerData.email} onChange={handleNewCustomerChange} placeholder="Ex: maria.oliveira@email.com" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-address">Endereço (Opcional)</Label>
                    <Textarea id="new-address" name="address" value={newCustomerData.address} onChange={handleNewCustomerChange} placeholder="Rua das Flores, 123, Bairro, Cidade - Estado" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="new-cpfCnpj">CPF/CNPJ (Opcional)</Label>
                    <Input id="new-cpfCnpj" name="cpfCnpj" value={newCustomerData.cpfCnpj} onChange={handleNewCustomerChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-birthDate">Data de Nascimento (Opcional)</Label>
                    <Input id="new-birthDate" name="birthDate" type="date" value={newCustomerData.birthDate} onChange={handleNewCustomerChange} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="new-notes">Observações (Opcional)</Label>
                    <Textarea id="new-notes" name="notes" value={newCustomerData.notes} onChange={handleNewCustomerChange} placeholder="Informações adicionais sobre o cliente..." />
                </div>
            </form>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsNewClientDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" form="new-client-form" disabled={isNewClientSubmitting}>
                    {isNewClientSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Cliente
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </div>
  );
}

    