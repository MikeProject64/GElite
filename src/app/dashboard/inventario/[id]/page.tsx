
'use client';

import { useState, useEffect, ChangeEvent, useRef, useMemo } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, query, where, addDoc, Timestamp, orderBy, runTransaction, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Package, History, ArrowDownCircle, ArrowUpCircle, Upload, Paperclip, Eye, File as FileIcon, ChevronsUpDown, Check, Filter, CalendarIcon, DollarSign, AlertTriangle } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InventoryItem, InventoryMovement, ServiceOrder } from '@/types';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const movementSchema = z.object({
  quantity: z.coerce.number().positive({ message: "A quantidade deve ser maior que zero." }),
  notes: z.string().optional(),
  serviceOrderId: z.string().optional(),
});
type MovementFormValues = z.infer<typeof movementSchema>;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function InventarioItemDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [item, setItem] = useState<InventoryItem | null>(null);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<'entrada' | 'saída' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    
    // State for history filters
    const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'entrada' | 'saída'>('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
    
    const itemId = Array.isArray(id) ? id[0] : id;

    const form = useForm<MovementFormValues>({
        resolver: zodResolver(movementSchema),
        defaultValues: { quantity: 1, notes: '', serviceOrderId: '' },
    });

    useEffect(() => {
        if (!user || !itemId) return;
        setIsLoading(true);

        const itemRef = doc(db, 'inventory', itemId);
        const unsubItem = onSnapshot(itemRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                setItem({ id: docSnap.id, ...docSnap.data() } as InventoryItem);
            } else {
                notFound();
            }
        });
        
        // Kardex needs to be ordered by date ASC to calculate balance
        const movementsQuery = query(
            collection(db, 'inventoryMovements'), 
            where('userId', '==', user.uid),
            where('itemId', '==', itemId),
            orderBy('createdAt', 'asc') 
        );
        const unsubMovements = onSnapshot(movementsQuery, (snapshot) => {
            const fetchedMovements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement));
            setMovements(fetchedMovements);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching inventory movements:", error);
            toast({ variant: 'destructive', title: 'Erro ao buscar histórico', description: 'Falha ao carregar as movimentações. Um índice pode ser necessário no Firestore.' });
            setIsLoading(false);
        });

        const ordersQuery = query(
            collection(db, 'serviceOrders'), 
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
        const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            const fetchedOrders = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder))
                .filter(order => !order.isTemplate);
            setServiceOrders(fetchedOrders);
        });
        
        return () => {
            unsubItem();
            unsubMovements();
            unsubOrders();
        };
    }, [user, itemId, toast]);

    const filteredServiceOrders = useMemo(() => 
        serviceOrders.filter(order => 
            (order.serviceType || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
            (order.clientName || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
            (order.id || '').toLowerCase().includes(orderSearchTerm.toLowerCase())
        ), [serviceOrders, orderSearchTerm]);
    
    // Calculate balance and apply filters to movements
    const processedMovements = useMemo(() => {
        if (!item) return [];

        let balance = item.initialQuantity || 0;
        const withBalance = movements.map(m => {
            if (m.type === 'entrada') {
                balance += m.quantity;
            } else {
                balance -= m.quantity;
            }
            return { ...m, balance };
        });
        
        const filtered = withBalance.filter(m => {
            const typeMatch = movementTypeFilter === 'all' || m.type === movementTypeFilter;
            let dateMatch = true;
            if (dateRangeFilter?.from) {
                dateMatch &&= m.createdAt.toDate() >= startOfDay(dateRangeFilter.from);
            }
            if (dateRangeFilter?.to) {
                dateMatch &&= m.createdAt.toDate() < startOfDay(new Date(dateRangeFilter.to.getTime() + 86400000));
            }
            return typeMatch && dateMatch;
        });
        
        // Reverse for display (most recent first)
        return filtered.reverse();
    }, [movements, item, movementTypeFilter, dateRangeFilter]);

    const handleOpenDialog = (type: 'entrada' | 'saída') => {
        setDialogType(type);
        form.reset({ quantity: 1, notes: '', serviceOrderId: '' });
        setFileToUpload(null);
        setIsDialogOpen(true);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileToUpload(e.target.files[0]);
        }
    };

    const onSubmit = async (data: MovementFormValues) => {
        if (!user || !item || !dialogType) return;
        setIsSubmitting(true);
        
        const itemRef = doc(db, 'inventory', item.id);

        try {
            await runTransaction(db, async (transaction) => {
                const itemDoc = await transaction.get(itemRef);
                if (!itemDoc.exists()) throw "Item não existe mais.";

                const currentQuantity = itemDoc.data().quantity;
                let newQuantity;

                if (dialogType === 'entrada') {
                    newQuantity = currentQuantity + data.quantity;
                } else {
                    if (currentQuantity < data.quantity) throw `Estoque insuficiente. Disponível: ${currentQuantity}.`;
                    newQuantity = currentQuantity - data.quantity;
                }

                let attachments = [];
                if (fileToUpload) {
                    const fileExtension = fileToUpload.name.split('.').pop();
                    const fileName = `${uuidv4()}.${fileExtension}`;
                    const storageRef = ref(storage, `inventoryMovements/${item.id}/${fileName}`);
                    const metadata = { customMetadata: { userId: user.uid } };
                    const snapshot = await uploadBytes(storageRef, fileToUpload, metadata);
                    const downloadURL = await getDownloadURL(snapshot.ref);
                    attachments.push({ name: fileToUpload.name, url: downloadURL });
                }

                const movementPayload: Omit<InventoryMovement, 'id' | 'serviceOrderCode'> = {
                    itemId: item.id, userId: user.uid, type: dialogType,
                    quantity: data.quantity, notes: data.notes, createdAt: Timestamp.now(), attachments,
                };
                
                 if (dialogType === 'saída' && data.serviceOrderId) {
                    const selectedOrder = serviceOrders.find(o => o.id === data.serviceOrderId);
                    if (selectedOrder) {
                        (movementPayload as InventoryMovement).serviceOrderId = selectedOrder.id;
                        (movementPayload as InventoryMovement).serviceOrderCode = `#${selectedOrder.id.substring(0, 6).toUpperCase()}`;
                    }
                }
                
                const movementRef = doc(collection(db, 'inventoryMovements'));
                transaction.set(movementRef, movementPayload);
                transaction.update(itemRef, { quantity: newQuantity, updatedAt: Timestamp.now() });
            });
            
            toast({ title: 'Sucesso!', description: `Movimentação de ${dialogType} registrada.` });
            setIsDialogOpen(false);
        } catch (error) {
             const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : "Ocorreu um erro.");
             toast({ variant: 'destructive', title: 'Erro na Transação', description: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const totalItemValue = useMemo(() => {
        if (!item) return 0;
        return item.quantity * item.cost;
    }, [item]);

    if (isLoading) {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-48" /></div>
            <div className="grid md:grid-cols-3 gap-6"><Skeleton className="h-48 md:col-span-1" /><Skeleton className="h-48 md:col-span-2" /></div>
            <Skeleton className="h-64 w-full" />
          </div>
        );
    }
      
    if (!item) return null;
    
    const isLowStock = item.minStock && item.quantity <= item.minStock;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/dashboard/inventario"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
                    <Package className='h-5 w-5' />
                    Detalhes do Item
                </h1>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{item.name}</CardTitle>
                            <CardDescription>Custo unitário: {formatCurrency(item.cost)}</CardDescription>
                            {isLowStock && <Badge variant="destructive" className="gap-1.5 w-fit"><AlertTriangle className="h-3 w-3" />Estoque Baixo</Badge>}
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{item.quantity}</p>
                            <p className="text-sm text-muted-foreground">unidades em estoque</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><DollarSign className='h-5 w-5'/> Valor em Estoque</CardTitle>
                             <CardDescription>Valor total deste item no estoque.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{formatCurrency(totalItemValue)}</p>
                        </CardContent>
                    </Card>
                </div>
                 <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button onClick={() => handleOpenDialog('entrada')}><ArrowUpCircle className="mr-2 h-4 w-4" /> Registrar Entrada</Button>
                        <Button variant="secondary" onClick={() => handleOpenDialog('saída')}><ArrowDownCircle className="mr-2 h-4 w-4" /> Registrar Saída</Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Movimentações (Kardex)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
                        <div className="grid gap-2">
                            <Label htmlFor="type-filter">Filtrar por Tipo</Label>
                            <Select value={movementTypeFilter} onValueChange={(v) => setMovementTypeFilter(v as any)}>
                                <SelectTrigger id="type-filter"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="entrada">Entradas</SelectItem>
                                    <SelectItem value="saída">Saídas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date-filter">Filtrar por Data</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="date-filter" variant="outline" className={cn("justify-start text-left font-normal", !dateRangeFilter && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRangeFilter?.from ? (dateRangeFilter.to ? `${format(dateRangeFilter.from, "dd/MM/yy")} - ${format(dateRangeFilter.to, "dd/MM/yy")}` : format(dateRangeFilter.from, "dd/MM/yyyy")) : (<span>Selecione um período</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="range" selected={dateRangeFilter} onSelect={setDateRangeFilter} numberOfMonths={1} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {processedMovements.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Nenhuma movimentação para o filtro selecionado.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Quantidade</TableHead>
                                    <TableHead>Saldo</TableHead>
                                    <TableHead>OS Associada</TableHead>
                                    <TableHead>Notas</TableHead>
                                    <TableHead>Anexo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedMovements.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell>{format(m.createdAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                                        <TableCell>
                                            <Badge variant={m.type === 'entrada' ? 'default' : 'secondary'} className="capitalize">{m.type}</Badge>
                                        </TableCell>
                                        <TableCell className={`font-medium ${m.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                                        </TableCell>
                                        <TableCell className="font-bold">{m.balance}</TableCell>
                                         <TableCell>
                                            {m.serviceOrderId ? (
                                                <Button variant="link" asChild className="p-0 h-auto font-mono text-sm">
                                                    <Link href={`/dashboard/servicos/${m.serviceOrderId}`} target="_blank">
                                                        {m.serviceOrderCode}
                                                    </Link>
                                                </Button>
                                            ) : ('-')}
                                        </TableCell>
                                        <TableCell>{m.notes}</TableCell>
                                        <TableCell>
                                            {m.attachments && m.attachments.length > 0 ? (
                                                <Button variant="outline" size="icon" asChild>
                                                    <a href={m.attachments[0].url} target="_blank" rel="noopener noreferrer">
                                                        <FileIcon className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar {dialogType === 'entrada' ? 'Entrada' : 'Saída'} de Item</DialogTitle>
                        <DialogDescription>Atualize o estoque para o item "{item.name}".</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="quantity" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantidade</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             {dialogType === 'saída' && (
                                <FormField control={form.control} name="serviceOrderId" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Associar à Ordem de Serviço (Opcional)</FormLabel>
                                        <Popover open={isOrderDropdownOpen} onOpenChange={setIsOrderDropdownOpen}>
                                            <PopoverTrigger asChild>
                                                <Button type="button" variant="outline" role="combobox" aria-expanded={isOrderDropdownOpen} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                    <span className='truncate'>
                                                        {field.value ? serviceOrders.find(o => o.id === field.value)?.serviceType : "Selecione uma O.S."}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Buscar O.S..." value={orderSearchTerm} onValueChange={setOrderSearchTerm}/>
                                                    <CommandList>
                                                        <CommandEmpty>Nenhuma O.S. encontrada.</CommandEmpty>
                                                        <CommandGroup>
                                                        <ScrollArea className="h-48">
                                                            {filteredServiceOrders.map((order) => (
                                                                <CommandItem
                                                                    key={order.id}
                                                                    value={`${order.serviceType} ${order.clientName} ${order.id}`}
                                                                    onSelect={() => {
                                                                        field.onChange(order.id);
                                                                        setIsOrderDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", field.value === order.id ? "opacity-100" : "opacity-0")} />
                                                                    <div>
                                                                        <p className="font-medium">{order.serviceType}</p>
                                                                        <p className="text-xs text-muted-foreground">{order.clientName} / #{order.id.substring(0, 6).toUpperCase()}</p>
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
                             )}
                             <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas (Opcional)</FormLabel>
                                    <FormControl><Textarea placeholder="Ex: Compra do fornecedor ABC" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="attachment">Anexo (Opcional)</Label>
                                <Input id="attachment" type="file" onChange={handleFileChange} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Confirmar {dialogType === 'entrada' ? 'Entrada' : 'Saída'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

