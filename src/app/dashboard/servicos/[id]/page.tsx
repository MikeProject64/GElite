
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, Timestamp, arrayUnion, collection, query, where, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/settings-provider';
import { ArrowLeft, User, Wrench, Thermometer, Briefcase, Paperclip, Upload, File, Loader2, Info, Printer, DollarSign, CalendarIcon } from 'lucide-react';
import { ServiceOrder, Manager } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Cancelada': return 'destructive';
    default:
        // Simple hash to get a deterministic but varied style for custom statuses
        const hash = status.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        return (Math.abs(hash) % 2 === 0) ? 'secondary' : 'outline';
  }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function ServicoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const orderId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!orderId) return;
    
    setIsLoading(true);
    const orderRef = doc(db, 'serviceOrders', orderId);

    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as ServiceOrder);
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Ordem de serviço não encontrada.' });
        router.push('/dashboard/servicos');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, router, toast]);

  // Fetch Managers
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'managers'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setManagers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Manager)));
    });
    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    try {
      const orderRef = doc(db, 'serviceOrders', order.id);
      const updateData: any = { status: newStatus };

      if (newStatus === 'Concluída' && !order.completedAt) {
        updateData.completedAt = Timestamp.now();
      } else if (newStatus !== 'Concluída' && order.completedAt) {
        updateData.completedAt = null;
      }

      await updateDoc(orderRef, updateData);
      toast({ title: 'Sucesso!', description: 'Status da ordem de serviço atualizado.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o status.' });
    }
  };
  
  const handleDueDateChange = async (date: Date | undefined) => {
    if (!order || !date) return;
    try {
      const orderRef = doc(db, 'serviceOrders', order.id);
      await updateDoc(orderRef, { dueDate: Timestamp.fromDate(date) });
      toast({ title: 'Sucesso!', description: 'Prazo de entrega atualizado.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o prazo.' });
    }
  };

  const handleManagerChange = async (newManagerId: string) => {
    if (!order || !newManagerId) return;
    const selectedManager = managers.find(m => m.id === newManagerId);
    if (!selectedManager) return;

    try {
        const orderRef = doc(db, 'serviceOrders', order.id);
        await updateDoc(orderRef, {
            managerId: selectedManager.id,
            managerName: selectedManager.name
        });
        toast({ title: 'Sucesso!', description: 'Responsável atualizado.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o responsável.' });
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !order || !user) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const storage = getStorage();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const storageRef = ref(storage, `serviceOrders/${order.id}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const orderRef = doc(db, 'serviceOrders', order.id);
      await updateDoc(orderRef, {
        attachments: arrayUnion({ name: file.name, url: downloadURL })
      });

      toast({ title: 'Sucesso!', description: 'Arquivo anexado.' });
    } catch (error: any) {
      console.error("File upload error:", error);
      let description = 'Falha ao anexar o arquivo.';
      if (error.code === 'storage/unauthorized') {
          description = 'Você não tem permissão para enviar arquivos. Verifique as regras de segurança do Storage.';
      }
      toast({ variant: 'destructive', title: 'Erro de Upload', description });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return null;
  }
  
  const getCustomFieldLabel = (fieldId: string) => {
    return settings.serviceOrderCustomFields?.find(f => f.id === fieldId)?.name || fieldId;
  };

  const getCustomFieldType = (fieldId: string) => {
    return settings.serviceOrderCustomFields?.find(f => f.id === fieldId)?.type || 'text';
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/servicos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <Wrench className='h-5 w-5' />
            Detalhes da Ordem de Serviço
        </h1>
        <Badge variant={getStatusVariant(order.status)} className="text-base px-3 py-1">{order.status}</Badge>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
              <CardHeader>
                <CardTitle>{order.serviceType}</CardTitle>
                <CardDescription>
                  Criada em: {format(order.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Cliente</p>
                            <p className="font-medium">{order.clientName}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Valor Total</p>
                            <p className="font-medium">{formatCurrency(order.totalValue)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Responsável / Setor</p>
                            <Select value={order.managerId} onValueChange={handleManagerChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Definir responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                    {managers.map(manager => (
                                        <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[180px] justify-start text-left font-normal",
                                            !order.dueDate && "text-muted-foreground"
                                        )}
                                    >
                                        {order.dueDate ? format(order.dueDate.toDate(), "dd/MM/yyyy") : <span>Escolha uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={order.dueDate.toDate()}
                                        onSelect={handleDueDateChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Thermometer className="h-5 w-5 text-muted-foreground" />
                      <div>
                            <p className="text-sm text-muted-foreground">Atualizar Status</p>
                            <Select value={order.status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {settings.serviceStatuses?.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                      </div>
                    </div>
                </div>
                <div>
                    <h3 className="font-medium mb-2">Descrição do Problema</h3>
                    <p className="text-muted-foreground bg-secondary/50 p-4 rounded-md whitespace-pre-wrap">{order.problemDescription}</p>
                </div>
              </CardContent>
               <CardFooter className="justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/print/servico/${order.id}`} target="_blank">
                            <Printer className="mr-2 h-4 w-4"/>
                            Imprimir / PDF
                        </Link>
                    </Button>
                </CardFooter>
            </Card>

             {order.customFields && Object.keys(order.customFields).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Informações Adicionais</CardTitle>
                        <CardDescription>Campos personalizados para esta ordem de serviço.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                       {Object.entries(order.customFields).map(([key, value]) => {
                           if (!value) return null;
                           const fieldType = getCustomFieldType(key);
                           let displayValue = value;
                           if (fieldType === 'date' && value && typeof value === 'object' && 'seconds' in value) {
                                displayValue = format((value as any).toDate(), 'dd/MM/yyyy');
                           }
                           return (
                                <div key={key} className="flex flex-col">
                                    <p className="text-sm font-medium">{getCustomFieldLabel(key)}</p>
                                    <p className="text-muted-foreground">{String(displayValue) || 'Não informado'}</p>
                                </div>
                           )
                       })}
                    </CardContent>
                </Card>
            )}

        </div>

          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Paperclip/> Anexos</CardTitle>
              <CardDescription>Adicione fotos e documentos relevantes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="picture">Adicionar anexo</Label>
                  <Input id="picture" type="file" onChange={handleFileUpload} disabled={isUploading}/>
              </div>
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    <span>Enviando...</span>
                </div>
              )}
              <div className="space-y-2">
                {order.attachments && order.attachments.length > 0 ? (
                  order.attachments.map((file, index) => (
                    <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-md bg-secondary hover:bg-secondary/80">
                      <File className="h-4 w-4" />
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-center text-muted-foreground pt-4">Nenhum anexo encontrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
