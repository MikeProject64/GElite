
'use client';

import { useState, useEffect, ChangeEvent, useRef, useMemo } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, query, where, addDoc, Timestamp, orderBy, runTransaction, getDoc, deleteField } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import Link from 'next/link';
import Image from 'next/image';
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
import { Loader2, ArrowLeft, Package, History, ArrowDownCircle, ArrowUpCircle, Upload, Paperclip, Eye, File as FileIcon, ChevronsUpDown, Check, Filter, CalendarIcon, DollarSign, AlertTriangle, Pencil } from 'lucide-react';
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

const editItemSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  cost: z.coerce.number().min(0, { message: 'O custo não pode ser negativo.' }),
  minStock: z.coerce.number().min(0, { message: 'O estoque mínimo não pode ser negativo.' }).optional(),
});
type EditItemFormValues = z.infer<typeof editItemSchema>;

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
    const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
    const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
    const [movementDialogType, setMovementDialogType] = useState<'entrada' | 'saída' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [previewFile, setPreviewFile] = useState<{ name: string; url: string; } | null>(null);

    const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    
    const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'entrada' | 'saída'>('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
    
    const itemId = Array.isArray(id) ? id[0] : id;

    const movementForm = useForm<MovementFormValues>({
        resolver: zodResolver(movementSchema),
        defaultValues: { quantity: 1, notes: '', serviceOrderId: '' },
    });

    const editItemForm = useForm<EditItemFormValues>({
        resolver: zodResolver(editItemSchema),
    });

    useEffect(() => {
        if (isEditItemDialogOpen && item) {
            editItemForm.reset({
                name: item.name,
                description: item.description,
                cost: item.cost,
                minStock: item.minStock,
            });
        }
    }, [isEditItemDialogOpen, item, editItemForm]);

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
        
        const movementsQuery = query(collection(db, 'inventoryMovements'), where('userId', '==', user.uid), where('itemId', '==', itemId), orderBy('createdAt', 'asc'));
        const unsubMovements = onSnapshot(movementsQuery, (snapshot) => {
            setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching inventory movements:", error);
            toast({ variant: 'destructive', title: 'Erro ao buscar histórico', description: 'Falha ao carregar as movimentações.' });
            setIsLoading(false);
        });

        const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            setServiceOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)).filter(order => !order.isTemplate));
        });
        
        return () => { unsubItem(); unsubMovements(); unsubOrders(); };
    }, [user, itemId, toast]);

    const filteredServiceOrders = useMemo(() => 
        serviceOrders.filter(order => 
            (order.serviceType || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
            (order.clientName || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
            (order.id || '').toLowerCase().includes(orderSearchTerm.toLowerCase())
        ), [serviceOrders, orderSearchTerm]);
    
    const processedMovements = useMemo(() => {
        if (!item) return [];
        let balance = item.initialQuantity || 0;
        const withBalance = movements.map(m => {
            if (m.type === 'entrada') balance += m.quantity; else balance -= m.quantity;
            return { ...m, balance };
        });
        
        return withBalance.filter(m => {
            const typeMatch = movementTypeFilter === 'all' || m.type === movementTypeFilter;
            let dateMatch = true;
            if (dateRangeFilter?.from) dateMatch &&= m.createdAt.toDate() >= startOfDay(dateRangeFilter.from);
            if (dateRangeFilter?.to) dateMatch &&= m.createdAt.toDate() < startOfDay(new Date(dateRangeFilter.to.getTime() + 86400000));
            return typeMatch && dateMatch;
        }).reverse();
    }, [movements, item, movementTypeFilter, dateRangeFilter]);

    const handleOpenMovementDialog = (type: 'entrada' | 'saída') => {
        setMovementDialogType(type);
        movementForm.reset({ quantity: 1, notes: '', serviceOrderId: '' });
        setFileToUpload(null);
        setIsMovementDialogOpen(true);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) setFileToUpload(e.target.files[0]);
    };

    const onMovementSubmit = async (data: MovementFormValues) => {
        if (!user || !item || !movementDialogType) return;
        setIsSubmitting(true);
        const itemRef = doc(db, 'inventory', item.id);
        try {
            await runTransaction(db, async (transaction) => {
                const itemDoc = await transaction.get(itemRef);
                if (!itemDoc.exists()) throw "Item não existe mais.";
                const currentQuantity = itemDoc.data().quantity;
                let newQuantity;
                if (movementDialogType === 'entrada') newQuantity = currentQuantity + data.quantity;
                else {
                    if (currentQuantity < data.quantity) throw `Estoque insuficiente. Disponível: ${currentQuantity}.`;
                    newQuantity = currentQuantity - data.quantity;
                }
                let attachments = [];
                if (fileToUpload) {
                    const fileExtension = fileToUpload.name.split('.').pop();
                    const fileName = `${uuidv4()}.${fileExtension}`;
                    const storageRef = ref(storage, `inventoryMovements/${item.id}/${fileName}`);
                    await uploadBytes(storageRef, fileToUpload, { customMetadata: { userId: user.uid } });
                    const downloadURL = await getDownloadURL(storageRef);
                    attachments.push({ name: fileToUpload.name, url: downloadURL });
                }
                const movementPayload: Omit<InventoryMovement, 'id' | 'serviceOrderCode'> = {
                    itemId: item.id, userId: user.uid, type: movementDialogType,
                    quantity: data.quantity, notes: data.notes, createdAt: Timestamp.now(), attachments,
                };
                if (movementDialogType === 'saída' && data.serviceOrderId) {
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
            toast({ title: 'Sucesso!', description: `Movimentação de ${movementDialogType} registrada.` });
            setIsMovementDialogOpen(false);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro na Transação', description: (error as Error).message });
        } finally { setIsSubmitting(false); }
    };
    
    const onItemEditSubmit = async (data: EditItemFormValues) => {
        if (!item) return;
        setIsSubmitting(true);
        try {
            const itemRef = doc(db, 'inventory', item.id);
            await updateDoc(itemRef, { ...data, updatedAt: Timestamp.now() });
            toast({ title: 'Sucesso!', description: 'Item atualizado.' });
            setIsEditItemDialogOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o item.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !item || !user) return;
        setIsUploading(true);
        const file = e.target.files[0];
        try {
            if (item.photoURL) {
                try {
                    const oldPhotoRef = ref(storage, item.photoURL);
                    await deleteObject(oldPhotoRef);
                } catch (error: any) {
                    if (error.code !== 'storage/object-not-found') console.warn("Could not delete old photo:", error);
                }
            }
            const storagePath = `inventoryItems/${item.id}/${uuidv4()}-${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file, { customMetadata: { userId: user.uid } });
            const downloadURL = await getDownloadURL(storageRef);
            await updateDoc(doc(db, 'inventory', item.id), { photoURL: downloadURL });
            toast({ title: 'Sucesso!', description: 'Foto do item atualizada.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao enviar a imagem.' });
        } finally {
            setIsUploading(false);
        }
    };

    const renderPreview = (file: { name: string; url: string; } | null) => {
        if (!file) return null;
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
        if (fileExtension === 'pdf') return <iframe src={file.url} className="w-full h-full border-0" title={file.name} />;
        if (imageExtensions.includes(fileExtension || '')) return <Image src={file.url} alt={file.name} fill className="object-contain" />;
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <p className='font-medium'>Pré-visualização não disponível</p>
              <p className="text-sm text-muted-foreground">O arquivo '{file.name}' não pode ser exibido aqui.</p>
              <Button asChild variant="link" className="mt-2"><a href={file.url} target="_blank" rel="noopener noreferrer">Abrir em nova aba</a></Button>
          </div>
        );
    };

    const totalItemValue = useMemo(() => item ? item.quantity * item.cost : 0, [item]);
    
    if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
    if (!item) return null;
    
    const isLowStock = item.minStock && item.quantity <= item.minStock;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild><Link href="/dashboard/inventario"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link></Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2"><Package className='h-5 w-5' />{item.name}</h1>
                <Button size="sm" variant="outline" onClick={() => setIsEditItemDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar Item</Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <div className="relative w-40 h-40 mb-4 bg-muted rounded-lg">
                           <Image src={item.photoURL || 'https://placehold.co/400x400.png'} alt={item.name} fill className="object-cover rounded-lg" />
                        </div>
                        <Label htmlFor="photo-upload" className="w-full"><Button variant="outline" asChild className="w-full"><span className="flex items-center"><Upload className="mr-2 h-4 w-4" />Trocar Foto</span></Button></Label>
                        <Input id="photo-upload" type="file" className="hidden" onChange={handlePhotoUpload} disabled={isUploading}/>
                        {isUploading && <p className="text-xs text-muted-foreground mt-2">Enviando...</p>}
                        <p className="text-sm text-muted-foreground mt-4">{item.description || 'Sem descrição.'}</p>
                    </CardContent>
                </Card>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle>{item.quantity}</CardTitle><CardDescription>Unidades em Estoque</CardDescription></CardHeader>
                        <CardContent>{isLowStock && <Badge variant="destructive" className="gap-1.5"><AlertTriangle className="h-3 w-3" />Estoque Baixo</Badge>}</CardContent>
                    </Card>
                    <Card><CardHeader><CardTitle>{formatCurrency(totalItemValue)}</CardTitle><CardDescription>Valor Total em Estoque</CardDescription></CardHeader></Card>
                    <Card className="sm:col-span-2"><CardHeader>
                        <CardTitle>Ações Rápidas</CardTitle>
                        <CardContent className="pt-4 flex flex-col sm:flex-row gap-2"><Button onClick={() => handleOpenMovementDialog('entrada')}><ArrowUpCircle className="mr-2 h-4 w-4" /> Registrar Entrada</Button><Button variant="secondary" onClick={() => handleOpenMovementDialog('saída')}><ArrowDownCircle className="mr-2 h-4 w-4" /> Registrar Saída</Button></CardContent>
                    </CardHeader></Card>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Movimentações (Kardex)</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg bg-muted/50">
                        <div className="grid gap-2"><Label htmlFor="type-filter">Filtrar por Tipo</Label><Select value={movementTypeFilter} onValueChange={(v) => setMovementTypeFilter(v as any)}><SelectTrigger id="type-filter"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="entrada">Entradas</SelectItem><SelectItem value="saída">Saídas</SelectItem></SelectContent></Select></div>
                        <div className="grid gap-2"><Label htmlFor="date-filter">Filtrar por Data</Label><Popover><PopoverTrigger asChild><Button id="date-filter" variant="outline" className={cn("justify-start text-left font-normal", !dateRangeFilter && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRangeFilter?.from ? (dateRangeFilter.to ? `${format(dateRangeFilter.from, "dd/MM/yy")} - ${format(dateRangeFilter.to, "dd/MM/yy")}` : format(dateRangeFilter.from, "dd/MM/yyyy")) : (<span>Selecione um período</span>)}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={dateRangeFilter} onSelect={setDateRangeFilter} numberOfMonths={1} /></PopoverContent></Popover></div>
                    </div>
                    {processedMovements.length === 0 ? (<p className="text-center text-muted-foreground py-4">Nenhuma movimentação para o filtro selecionado.</p>) : (<Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Quantidade</TableHead><TableHead>Saldo</TableHead><TableHead>OS</TableHead><TableHead>Notas</TableHead><TableHead>Anexo</TableHead></TableRow></TableHeader><TableBody>{processedMovements.map(m => (<TableRow key={m.id}><TableCell>{format(m.createdAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell><TableCell><Badge variant={m.type === 'entrada' ? 'default' : 'secondary'} className="capitalize">{m.type}</Badge></TableCell><TableCell className={`font-medium ${m.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>{m.type === 'entrada' ? '+' : '-'}{m.quantity}</TableCell><TableCell className="font-bold">{m.balance}</TableCell><TableCell>{m.serviceOrderId ? (<Button variant="link" asChild className="p-0 h-auto font-mono text-sm"><Link href={`/dashboard/servicos/${m.serviceOrderId}`} target="_blank">{m.serviceOrderCode}</Link></Button>) : ('-')}</TableCell><TableCell>{m.notes}</TableCell><TableCell>{m.attachments && m.attachments.length > 0 ? (<Button variant="outline" size="icon" onClick={() => setPreviewFile(m.attachments![0])}><Eye className="h-4 w-4" /></Button>) : '-'}</TableCell></TableRow>))}</TableBody></Table>)}
                </CardContent>
            </Card>

            <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}><DialogContent><DialogHeader><DialogTitle>Registrar {movementDialogType === 'entrada' ? 'Entrada' : 'Saída'} de Item</DialogTitle><DialogDescription>Atualize o estoque para o item "{item.name}".</DialogDescription></DialogHeader><Form {...movementForm}><form onSubmit={movementForm.handleSubmit(onMovementSubmit)} className="space-y-4"><FormField control={movementForm.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={movementForm.control} name="serviceOrderId" render={({ field }) => (movementDialogType === 'saída' && <FormItem className="flex flex-col"><FormLabel>Associar à Ordem de Serviço (Opcional)</FormLabel><Popover open={isOrderDropdownOpen} onOpenChange={setIsOrderDropdownOpen}><PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" aria-expanded={isOrderDropdownOpen} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}><span className='truncate'>{field.value ? serviceOrders.find(o => o.id === field.value)?.serviceType : "Selecione uma O.S."}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start"><Command><CommandInput placeholder="Buscar O.S..." value={orderSearchTerm} onValueChange={setOrderSearchTerm}/><CommandList><CommandEmpty>Nenhuma O.S. encontrada.</CommandEmpty><CommandGroup><ScrollArea className="h-48">{filteredServiceOrders.map((order) => (<CommandItem key={order.id} value={`${order.serviceType} ${order.clientName} ${order.id}`} onSelect={() => { field.onChange(order.id); setIsOrderDropdownOpen(false); }}><div><p className="font-medium">{order.serviceType}</p><p className="text-xs text-muted-foreground">{order.clientName} / #{order.id.substring(0, 6).toUpperCase()}</p></div></CommandItem>))}</ScrollArea></CommandGroup></CommandList></Command></PopoverContent></Popover><FormMessage /></FormItem>)} /><FormField control={movementForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas (Opcional)</FormLabel><FormControl><Textarea placeholder="Ex: Compra do fornecedor ABC" {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="grid w-full max-w-sm items-center gap-1.5"><Label htmlFor="attachment">Anexo (Opcional)</Label><Input id="attachment" type="file" onChange={handleFileChange} /></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setIsMovementDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar {movementDialogType === 'entrada' ? 'Entrada' : 'Saída'}</Button></DialogFooter></form></Form></DialogContent></Dialog>
            <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}><DialogContent><DialogHeader><DialogTitle>Editar Item</DialogTitle><DialogDescription>Atualize os detalhes de "{item.name}".</DialogDescription></DialogHeader><Form {...editItemForm}><form onSubmit={editItemForm.handleSubmit(onItemEditSubmit)} className="space-y-4"><FormField control={editItemForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={editItemForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)}/><div className="grid grid-cols-2 gap-4"><FormField control={editItemForm.control} name="cost" render={({ field }) => (<FormItem><FormLabel>Custo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={editItemForm.control} name="minStock" render={({ field }) => (<FormItem><FormLabel>Estoque Mínimo</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/></div><DialogFooter><Button type="button" variant="ghost" onClick={() => setIsEditItemDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar Alterações</Button></DialogFooter></form></Form></DialogContent></Dialog>
            <Dialog open={!!previewFile} onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}><DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4"><DialogHeader className="flex-shrink-0"><DialogTitle className="truncate">{previewFile?.name}</DialogTitle></DialogHeader><div className="flex-grow h-full w-full overflow-auto bg-muted/50 rounded-md">{renderPreview(previewFile)}</div></DialogContent></Dialog>
        </div>
    );
}
