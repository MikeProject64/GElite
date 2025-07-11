
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, Timestamp, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, UserPlus, PlusCircle, Search, CalendarIcon, Trash2, FileSignature, Check, ChevronsUpDown, PauseCircle, PlayCircle, Ban, History } from 'lucide-react';
import { Customer, ServiceOrder, ServiceAgreement } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';


const agreementSchema = z.object({
    title: z.string().min(5, { message: "O título deve ter pelo menos 5 caracteres." }),
    clientId: z.string({ required_error: "Selecione um cliente." }),
    serviceOrderTemplateId: z.string({ required_error: "Selecione um modelo de O.S." }),
    frequency: z.enum(['monthly', 'quarterly', 'semiannually', 'annually']),
    startDate: z.date({ required_error: "A data de início é obrigatória." }),
    notes: z.string().optional(),
});
type AgreementFormValues = z.infer<typeof agreementSchema>;

const frequencyMap = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannually: 'Semestral',
    annually: 'Anual',
};

export default function ContratosPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [serviceOrderTemplates, setServiceOrderTemplates] = useState<ServiceOrder[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [editingAgreement, setEditingAgreement] = useState<ServiceAgreement | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [deletingAgreementId, setDeletingAgreementId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    const form = useForm<AgreementFormValues>({
        resolver: zodResolver(agreementSchema),
        defaultValues: { title: '', clientId: '', serviceOrderTemplateId: '', frequency: 'monthly', startDate: new Date(), notes: '' }
    });

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        const unsubscribes: (() => void)[] = [];

        const qAgreements = query(collection(db, 'serviceAgreements'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        unsubscribes.push(onSnapshot(qAgreements, snap => setAgreements(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceAgreement)))));
        
        const qCustomers = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
        unsubscribes.push(onSnapshot(qCustomers, snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)))));
        
        const qTemplates = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('isTemplate', '==', true));
        unsubscribes.push(onSnapshot(qTemplates, snap => setServiceOrderTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceOrder)))));

        Promise.all([
            new Promise(res => onSnapshot(qAgreements, res)),
        ]).finally(() => setIsLoading(false));

        return () => unsubscribes.forEach(unsub => unsub());
    }, [user]);

    useEffect(() => {
        if (isDialogOpen) {
            form.reset(editingAgreement ? { ...editingAgreement, startDate: editingAgreement.startDate.toDate() } : { title: '', clientId: '', serviceOrderTemplateId: '', frequency: 'monthly', startDate: new Date(), notes: '' });
        }
    }, [isDialogOpen, editingAgreement, form]);

    const filteredAgreements = useMemo(() => {
        return agreements.filter(a =>
            a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.clientName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [agreements, searchTerm]);
    
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
            customer.phone.toLowerCase().includes(customerSearchTerm.toLowerCase())
        );
    }, [customers, customerSearchTerm]);

    const handleAddNew = () => { setEditingAgreement(null); setIsDialogOpen(true); };
    const handleEdit = (agreement: ServiceAgreement) => { setEditingAgreement(agreement); setIsDialogOpen(true); };
    const handleDelete = (agreementId: string) => { setDeletingAgreementId(agreementId); setIsAlertOpen(true); };
    
    const handleStatusChange = async (agreement: ServiceAgreement, newStatus: ServiceAgreement['status']) => {
        try {
            const agreementRef = doc(db, 'serviceAgreements', agreement.id);
            await updateDoc(agreementRef, { status: newStatus });
            toast({ title: 'Sucesso!', description: 'Status do contrato atualizado.'});
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
        }
    };

    const confirmDelete = async () => {
        if (!deletingAgreementId) return;
        try {
            await deleteDoc(doc(db, 'serviceAgreements', deletingAgreementId));
            toast({ title: 'Sucesso!', description: 'Contrato excluído.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir o contrato.' });
        } finally {
            setDeletingAgreementId(null);
            setIsAlertOpen(false);
        }
    };

    const onSubmit = async (data: AgreementFormValues) => {
        if (!user) return;
        
        const client = customers.find(c => c.id === data.clientId);
        const template = serviceOrderTemplates.find(t => t.id === data.serviceOrderTemplateId);
        if (!client || !template) return;

        try {
            if (editingAgreement) {
                const agreementRef = doc(db, 'serviceAgreements', editingAgreement.id);
                await updateDoc(agreementRef, { ...data, startDate: Timestamp.fromDate(data.startDate) });
                toast({ title: 'Sucesso!', description: 'Contrato atualizado.' });
            } else {
                await addDoc(collection(db, 'serviceAgreements'), {
                    ...data,
                    userId: user.uid,
                    clientName: client.name,
                    serviceOrderTemplateName: template.templateName,
                    startDate: Timestamp.fromDate(data.startDate),
                    nextDueDate: Timestamp.fromDate(data.startDate),
                    status: 'active',
                    createdAt: Timestamp.now(),
                });
                toast({ title: 'Sucesso!', description: 'Contrato criado.' });
            }
            setIsDialogOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o contrato.' });
        }
    };
    
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Contratos e Serviços Recorrentes</h1>
                <Button size="sm" className="h-8 gap-1" onClick={handleAddNew}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Contrato</span>
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>{editingAgreement ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle></DialogHeader>
                    <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                        <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título do Contrato *</FormLabel><FormControl><Input placeholder="Ex: Manutenção Mensal de TI" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Cliente *</FormLabel>
                                <Popover open={isCustomerDropdownOpen} onOpenChange={setIsCustomerDropdownOpen}>
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
                                        <CommandInput placeholder="Buscar cliente..." onValueChange={setCustomerSearchTerm}/>
                                        <CommandList>
                                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                            <CommandGroup>
                                                {filteredCustomers.map((c) => (
                                                    <CommandItem value={c.name} key={c.id} onSelect={() => { form.setValue("clientId", c.id); setIsCustomerDropdownOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")} />
                                                        {c.name}
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

                        <FormField control={form.control} name="serviceOrderTemplateId" render={({ field }) => (<FormItem><FormLabel>Modelo de O.S. a ser gerada *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger></FormControl><SelectContent>{serviceOrderTemplates.map(t => (<SelectItem key={t.id} value={t.id}>{t.templateName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Frequência *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(frequencyMap).map(([key, value]) => (<SelectItem key={key} value={key}>{value}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data de Início/Primeira O.S. *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Detalhes do contrato, condições especiais, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
                    </form></Form>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader><CardTitle>Gestão de Contratos</CardTitle><CardDescription>Acompanhe seus contratos ativos e a geração automática de serviços.</CardDescription></CardHeader>
                <CardContent>
                    {isLoading ? (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) :
                     filteredAgreements.length === 0 ? (<div className="text-center py-10"><FileSignature className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Nenhum contrato criado.</h3></div>) :
                    (<Table><TableHeader><TableRow><TableHead>Contrato / Cliente</TableHead><TableHead>Status</TableHead><TableHead>Próxima O.S.</TableHead><TableHead>Frequência</TableHead><TableHead><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
                    <TableBody>{filteredAgreements.map(agreement => (
                        <TableRow key={agreement.id}>
                            <TableCell><div className="font-medium">{agreement.title}</div><div className="text-sm text-muted-foreground">{agreement.clientName}</div></TableCell>
                            <TableCell><Badge variant={agreement.status === 'active' ? 'default' : 'secondary'}>{agreement.status === 'active' ? 'Ativo' : (agreement.status === 'paused' ? 'Pausado' : 'Finalizado')}</Badge></TableCell>
                            <TableCell>{format(agreement.nextDueDate.toDate(), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{frequencyMap[agreement.frequency]}</TableCell>
                            <TableCell>
                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end"><DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEdit(agreement)}>Editar</DropdownMenuItem>
                                    {agreement.status === 'active' && <DropdownMenuItem onClick={() => handleStatusChange(agreement, 'paused')}><PauseCircle className="mr-2 h-4 w-4"/>Pausar</DropdownMenuItem>}
                                    {agreement.status === 'paused' && <DropdownMenuItem onClick={() => handleStatusChange(agreement, 'active')}><PlayCircle className="mr-2 h-4 w-4"/>Reativar</DropdownMenuItem>}
                                    {agreement.status !== 'finished' && <DropdownMenuItem onClick={() => handleStatusChange(agreement, 'finished')}><Ban className="mr-2 h-4 w-4"/>Finalizar</DropdownMenuItem>}
                                    <DropdownMenuItem disabled><History className="mr-2 h-4 w-4"/>Ver Histórico</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(agreement.id)}><Trash2 className="mr-2 h-4 w-4"/>Excluir</DropdownMenuItem>
                                </DropdownMenuContent></DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}</TableBody></Table>)}
                </CardContent>
                <CardFooter><div className="text-xs text-muted-foreground">Mostrando <strong>{filteredAgreements.length}</strong> contrato(s).</div></CardFooter>
            </Card>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Esta ação é irreversível e excluirá o contrato. As Ordens de Serviço já geradas não serão afetadas.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingAgreementId(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Sim, Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
    );
}

