
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, Timestamp, arrayUnion, collection, query, where, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
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
import { ArrowLeft, User, Wrench, Thermometer, Briefcase, Paperclip, Upload, File as FileIcon, Loader2, Info, Printer, DollarSign, CalendarIcon, Eye, History } from 'lucide-react';
import { ServiceOrder, Collaborator } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


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
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; } | null>(null);

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

  // Fetch Collaborators
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'collaborators'), where('userId', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setCollaborators(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator)));
    });
    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order || !user) return;
    try {
      const orderRef = doc(db, 'serviceOrders', order.id);
      const updateData: any = { status: newStatus };

      const logEntry = {
          timestamp: Timestamp.now(),
          userEmail: user?.email || 'Sistema',
          description: `Status alterado de "${order.status}" para "${newStatus}".`
      };
      updateData.activityLog = arrayUnion(logEntry);

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

  const handleCollaboratorChange = async (newCollaboratorId: string) => {
    if (!order || !newCollaboratorId || !user) return;
    const selectedCollaborator = collaborators.find(m => m.id === newCollaboratorId);
    if (!selectedCollaborator) return;

    try {
        const orderRef = doc(db, 'serviceOrders', order.id);
        const logEntry = {
            timestamp: Timestamp.now(),
            userEmail: user.email || 'Sistema',
            description: `Responsável alterado de "${order.collaboratorName || 'Nenhum'}" para "${selectedCollaborator.name}".`
        };
        await updateDoc(orderRef, {
            collaboratorId: selectedCollaborator.id,
            collaboratorName: selectedCollaborator.name,
            activityLog: arrayUnion(logEntry)
        });
        toast({ title: 'Sucesso!', description: 'Colaborador atualizado.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o colaborador.' });
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !order || !user) return;

    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const storageRef = ref(storage, `serviceOrders/${order.id}/${fileName}`);
        
        const metadata = {
            customMetadata: { 'userId': user.uid },
        };
        
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const orderRef = doc(db, 'serviceOrders', order.id);
        const logEntry = {
            timestamp: Timestamp.now(),
            userEmail: user?.email || 'Sistema',
            description: `Arquivo "${file.name}" foi anexado.`
        };

        await updateDoc(orderRef, {
            attachments: arrayUnion({ name: file.name, url: downloadURL }),
            activityLog: arrayUnion(logEntry)
        });

        toast({ title: 'Sucesso!', description: 'Arquivo anexado.' });
    } catch (error) {
        console.error("File upload error:", error);
        toast({ variant: 'destructive', title: 'Erro de Upload', description: "Falha ao enviar o anexo. Verifique suas permissões e tente novamente." });
    } finally {
        setIsUploading(false);
        if (e.target) e.target.value = ''; // Reset input
    }
};

  const renderPreview = (file: { name: string; url: string; } | null) => {
    if (!file) return null;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];

    if (fileExtension === 'pdf') {
      return <iframe src={file.url} className="w-full h-full border-0" title={file.name} />;
    }

    if (imageExtensions.includes(fileExtension || '')) {
      return <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain mx-auto" />;
    }

    if (videoExtensions.includes(fileExtension || '')) {
      return <video src={file.url} controls className="w-full max-h-full" />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <p className='font-medium'>Pré-visualização não disponível</p>
          <p className="text-sm text-muted-foreground">O arquivo '{file.name}' não pode ser exibido aqui.</p>
          <Button asChild variant="link" className="mt-2">
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                  Abrir em nova aba para download
              </a>
          </Button>
      </div>
    );
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
                            <p className="text-sm text-muted-foreground">Colaborador / Setor</p>
                            <Select value={order.collaboratorId} onValueChange={handleCollaboratorChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Definir responsável" />
                                </SelectTrigger>
                                <SelectContent>
                                    {collaborators.map(collaborator => (
                                        <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.name}</SelectItem>
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Alterações</CardTitle>
                    <CardDescription>Trilha de auditoria de todas as ações realizadas nesta O.S.</CardDescription>
                </CardHeader>
                <CardContent>
                    {order.activityLog && order.activityLog.length > 0 ? (
                        <ul className="space-y-4">
                        {order.activityLog
                            .slice()
                            .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())
                            .map((log, index) => (
                            <li key={index} className="flex gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div>
                                <p className="text-sm">{log.description}</p>
                                <p className="text-xs text-muted-foreground">
                                    {log.userEmail} em {format(log.timestamp.toDate(), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                </div>
                            </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhuma atividade registrada.</p>
                    )}
                </CardContent>
            </Card>

        </div>

          <Card className='lg:col-span-1'>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Paperclip/> Anexos</CardTitle>
              <CardDescription>Adicione e visualize fotos e documentos.</CardDescription>
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
                    <button
                      key={index}
                      onClick={() => setPreviewFile(file)}
                      className="flex w-full items-center gap-2 p-2 rounded-md bg-secondary hover:bg-secondary/80 text-left"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-center text-muted-foreground pt-4">Nenhum anexo encontrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
      </div>

       <Dialog open={!!previewFile} onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-grow h-full w-full overflow-auto bg-muted/50 rounded-md">
            {renderPreview(previewFile)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
