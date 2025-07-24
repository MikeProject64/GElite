'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, where, onSnapshot, Timestamp, doc, updateDoc, writeBatch, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format, isBefore, addDays, addMonths, addQuarters, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { Client, ServiceOrder, ServiceAgreement } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const agreementSchema = z.object({
    title: z.string().min(5, { message: "O título deve ter pelo menos 5 caracteres." }),
    clientId: z.string({ required_error: "Selecione um cliente." }).min(1, "Por favor, selecione um cliente."),
    serviceOrderTemplateId: z.string({ required_error: "Selecione um modelo de O.S." }),
    frequency: z.enum(['monthly', 'quarterly', 'semiannually', 'annually']),
    startDate: z.date({ required_error: "A data de início é obrigatória." }),
    notes: z.string().optional(),
});
export type AgreementFormValues = z.infer<typeof agreementSchema>;

const frequencyMap = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannually: 'Semestral',
    annually: 'Anual',
};

interface ContractFormProps {
    agreement?: ServiceAgreement | null;
    onSuccess: () => void;
}

export function ContractForm({ agreement, onSuccess }: ContractFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [customers, setCustomers] = useState<Client[]>([]);
    const [serviceOrderTemplates, setServiceOrderTemplates] = useState<ServiceOrder[]>([]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const form = useForm<AgreementFormValues>({
        resolver: zodResolver(agreementSchema),
        defaultValues: agreement 
            ? { ...agreement, startDate: agreement.startDate.toDate() } 
            : { title: '', clientId: '', serviceOrderTemplateId: '', frequency: 'monthly', startDate: new Date(), notes: '' }
    });

    useEffect(() => {
        if (!user) return;
        const unsubscribes: (() => void)[] = [];
        
        const qCustomers = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
        unsubscribes.push(onSnapshot(qCustomers, snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)))));
        
        const qTemplates = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('isTemplate', '==', true));
        unsubscribes.push(onSnapshot(qTemplates, snap => setServiceOrderTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceOrder)))));

        return () => unsubscribes.forEach(unsub => unsub());
    }, [user]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsCustomerDropdownOpen(false);
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const filteredCustomers = customers.filter(customer => 
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.toLowerCase().includes(customerSearchTerm.toLowerCase()))
    );
    
    const calculateNextDueDate = (currentDueDate: Date, frequency: AgreementFormValues['frequency']) => {
        switch (frequency) {
            case 'monthly': return addMonths(currentDueDate, 1);
            case 'quarterly': return addQuarters(currentDueDate, 1);
            case 'semiannually': return addMonths(currentDueDate, 6);
            case 'annually': return addYears(currentDueDate, 1);
            default: throw new Error(`Frequência desconhecida: ${frequency}`);
        }
    };
    
    const onSubmit = async (data: AgreementFormValues) => {
        if (!user) return;
        
        const client = customers.find(c => c.id === data.clientId);
        const template = serviceOrderTemplates.find(t => t.id === data.serviceOrderTemplateId);
        if (!client || !template) return;

        try {
            if (agreement) {
                const agreementRef = doc(db, 'serviceAgreements', agreement.id);
                await updateDoc(agreementRef, { ...data, startDate: Timestamp.fromDate(data.startDate) });
                toast({ title: 'Sucesso!', description: 'Contrato atualizado.' });
            } else {
                const batch = writeBatch(db);
                const agreementRef = doc(collection(db, 'serviceAgreements'));

                const shouldCreateInitialOS = isBefore(data.startDate, addDays(new Date(), 1));
                let nextDueDate = data.startDate;

                if (shouldCreateInitialOS) {
                    const newServiceOrderRef = doc(collection(db, 'serviceOrders'));
                    const newServiceOrder: Omit<ServiceOrder, 'id'> = {
                        clientId: client.id,
                        clientName: client.name,
                        status: 'Pendente',
                        creationDate: Timestamp.now(),
                        lastUpdate: Timestamp.now(),
                        dueDate: Timestamp.fromDate(data.startDate),
                        isTemplate: false,
                        generatedByAgreementId: agreementRef.id,
                        userId: user.uid,
                        serviceType: template.serviceType,
                        problemDescription: template.problemDescription,
                        totalValue: template.totalValue,
                    };
                    batch.set(newServiceOrderRef, newServiceOrder);
                    
                    nextDueDate = calculateNextDueDate(data.startDate, data.frequency);
                }
                
                batch.set(agreementRef, {
                    ...data,
                    userId: user.uid,
                    clientName: client.name,
                    serviceOrderTemplateName: template.templateName,
                    startDate: Timestamp.fromDate(data.startDate),
                    nextDueDate: Timestamp.fromDate(nextDueDate),
                    status: 'active',
                    createdAt: Timestamp.now(),
                });

                await batch.commit();
                toast({ title: 'Sucesso!', description: 'Contrato criado.' });
            }
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o contrato.' });
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título do Contrato *</FormLabel><FormControl><Input placeholder="Ex: Manutenção Mensal de TI" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Cliente *</FormLabel>
                        <div className="relative" ref={dropdownRef}>
                            <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} onClick={() => setIsCustomerDropdownOpen(prev => !prev)}>
                                <span className='truncate'>
                                    {field.value ? customers.find(c => c.id === field.value)?.name : "Selecione um cliente"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            {isCustomerDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
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
                    )}
                />

                <FormField control={form.control} name="serviceOrderTemplateId" render={({ field }) => (<FormItem><FormLabel>Modelo de O.S. a ser gerada *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger></FormControl><SelectContent>{serviceOrderTemplates.map(t => (<SelectItem key={t.id} value={t.id}>{t.templateName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="frequency" render={({ field }) => (<FormItem><FormLabel>Frequência *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Object.entries(frequencyMap).map(([key, value]) => (<SelectItem key={key} value={key}>{value}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data de Início/Primeira O.S. *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Detalhes do contrato, condições especiais, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className='flex justify-end pt-4'>
                    <Button type="button" variant="ghost" onClick={onSuccess}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
                </div>
            </form>
        </Form>
    );
} 