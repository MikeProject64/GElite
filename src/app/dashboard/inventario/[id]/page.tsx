
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
import { format } from 'date-fns';
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
import { Loader2, ArrowLeft, Package, History, ArrowDownCircle, ArrowUpCircle, Upload, Paperclip, Eye, File as FileIcon, ChevronsUpDown, Check } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InventoryItem, InventoryMovement, ServiceOrder } from '@/types';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    const orderDropdownRef = useRef<HTMLDivElement>(null);
    
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

        const movementsQuery = query(collection(db, 'inventoryMovements'), where('itemId', '==', itemId), orderBy('createdAt', 'desc'));
        const unsubMovements = onSnapshot(movementsQuery, (snapshot) => {
            setMovements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryMovement)));
            setIsLoading(false);
        }, () => setIsLoading(false));

        const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('isTemplate', '==', false), orderBy('createdAt', 'desc'));
        const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            setServiceOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)));
        });
        
        return () => {
            unsubItem();
            unsubMovements();
            unsubOrders();
        };
    }, [user, itemId, notFound]);

     useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (orderDropdownRef.current && !orderDropdownRef.current.contains(event.target as Node)) {
            setIsOrderDropdownOpen(false);
          }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }, [orderDropdownRef]);

    const filteredServiceOrders = useMemo(() => 
        serviceOrders.filter(order => 
            order.serviceType.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
            order.clientName.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
            order.id.toLowerCase().includes(orderSearchTerm.toLowerCase())
        ), [serviceOrders, orderSearchTerm]);
    
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
                    const snapshot = await uploadBytes(storageRef, fileToUpload, { customMetadata: { userId: user.uid } });
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

    if (isLoading) {
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-48" /></div>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        );
    }
      
    if (!item) return null;

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

            <Card>
                <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription>Custo unitário: {formatCurrency(item.cost)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{item.quantity}</p>
                    <p className="text-sm text-muted-foreground">unidades em estoque</p>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button onClick={() => handleOpenDialog('entrada')}><ArrowUpCircle className="mr-2 h-4 w-4" /> Registrar Entrada</Button>
                    <Button variant="secondary" onClick={() => handleOpenDialog('saída')}><ArrowDownCircle className="mr-2 h-4 w-4" /> Registrar Saída</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Movimentações (Kardex)</CardTitle>
                </CardHeader>
                <CardContent>
                    {movements.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Nenhuma movimentação registrada.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Quantidade</TableHead>
                                    <TableHead>OS Associada</TableHead>
                                    <TableHead>Notas</TableHead>
                                    <TableHead>Anexo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.map(m => (
                                    <TableRow key={m.id}>
                                        <TableCell>{format(m.createdAt.toDate(), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                                        <TableCell>
                                            <Badge variant={m.type === 'entrada' ? 'default' : 'secondary'} className="capitalize">{m.type}</Badge>
                                        </TableCell>
                                        <TableCell className={`font-medium ${m.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                            {m.type === 'entrada' ? '+' : '-'}{m.quantity}
                                        </TableCell>
                                         <TableCell>
                                            {m.serviceOrderId ? (
                                                <Button variant="link" asChild className="p-0 h-auto font-mono text-sm">
                                                    <Link href={`/dashboard/servicos/${m.serviceOrderId}`}>
                                                        {m.serviceOrderCode}
                                                    </Link>
                                                </Button>
                                            ) : (
                                                '-'
                                            )}
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
                                        <div className="relative" ref={orderDropdownRef}>
                                            <Button type="button" variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} onClick={() => setIsOrderDropdownOpen(prev => !prev)}>
                                                <span className='truncate'>
                                                    {field.value ? serviceOrders.find(o => o.id === field.value)?.serviceType : "Selecione uma O.S."}
                                                </span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                            {isOrderDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                                <div className="p-2">
                                                    <Input placeholder="Buscar O.S..." value={orderSearchTerm} onChange={(e) => setOrderSearchTerm(e.target.value)} autoFocus />
                                                </div>
                                                <ScrollArea className="h-48">
                                                {filteredServiceOrders.length > 0 ? (
                                                    filteredServiceOrders.map((order) => (
                                                    <button type="button" key={order.id} className="flex items-center w-full text-left p-2 text-sm hover:bg-accent"
                                                        onClick={() => {
                                                            field.onChange(order.id);
                                                            setIsOrderDropdownOpen(false);
                                                            setOrderSearchTerm('');
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", field.value === order.id ? "opacity-100" : "opacity-0")} />
                                                        <div>
                                                            <p className="font-medium">{order.serviceType}</p>
                                                            <p className="text-xs text-muted-foreground">{order.clientName} / #{order.id.substring(0, 6).toUpperCase()}</p>
                                                        </div>
                                                    </button>
                                                    ))
                                                ) : (
                                                    <p className="p-2 text-center text-sm text-muted-foreground">Nenhuma O.S. encontrada.</p>
                                                )}
                                                </ScrollArea>
                                            </div>
                                            )}
                                        </div>
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

