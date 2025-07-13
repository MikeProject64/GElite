

'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, Timestamp, arrayUnion, collection, query, where, orderBy, getDoc, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/settings-provider';
import { ArrowLeft, User, Wrench, Thermometer, Briefcase, Paperclip, Upload, File as FileIcon, Loader2, Info, Printer, DollarSign, CalendarIcon, Eye, History, Save, Pencil, Trash2, ChevronsUpDown, FileSignature } from 'lucide-react';
import { ServiceOrder, Collaborator, Customer, ServiceOrderPriority } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const templateFormSchema = z.object({
  templateName: z.string().min(3, { message: 'O nome do modelo deve ter pelo menos 3 caracteres.' }),
});
type TemplateFormValues = z.infer<typeof templateFormSchema>;

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2 h-4 w-4" viewBox="0 0 16 16">
        <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
    </svg>
);

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
  const [serviceOrderVersions, setServiceOrderVersions] = useState<ServiceOrder[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string; } | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);

  const orderId = Array.isArray(id) ? id[0] : id;

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { templateName: '' },
  });

  const getStatusColor = (statusName: string) => {
    const status = settings.serviceStatuses?.find(s => s.name === statusName);
    return status ? `hsl(${status.color})` : 'hsl(var(--muted-foreground))';
  };

  const StatusBadge = ({ status }: { status: string }) => {
    return (
        <Badge style={{ backgroundColor: getStatusColor(status), color: 'hsl(var(--primary-foreground))' }} className="text-base px-3 py-1 border-transparent">
            {status}
        </Badge>
    );
  };


  useEffect(() => {
    if (!orderId || !user) return;
    
    setIsLoading(true);
    const orderRef = doc(db, 'serviceOrders', orderId);

    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() } as ServiceOrder;
        if (orderData.isTemplate) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Este é um modelo, não uma ordem de serviço.' });
            router.push('/dashboard/servicos/modelos');
            return;
        }
        setOrder(orderData);

        const originalId = orderData.originalServiceOrderId || orderData.id;
        const versionsQuery = query(
            collection(db, 'serviceOrders'),
            where('userId', '==', user.uid),
            where('originalServiceOrderId', '==', originalId),
            orderBy('version', 'desc')
        );
        onSnapshot(versionsQuery, (versionSnap) => {
            const versions = versionSnap.docs.map(d => ({id: d.id, ...d.data()}) as ServiceOrder);
            setServiceOrderVersions(versions);
        });

      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Ordem de serviço não encontrada.' });
        router.push('/dashboard/servicos');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orderId, router, toast, user]);

  useEffect(() => {
    if (order?.clientId) {
        const customerRef = doc(db, 'customers', order.clientId);
        getDoc(customerRef).then(customerSnap => {
            if (customerSnap.exists()) {
                const customerData = customerSnap.data() as Customer;
                setCustomerPhone(customerData.phone || null);
            }
        });
    }
  }, [order?.clientId]);

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

  const handlePriorityChange = async (newPriority: ServiceOrderPriority) => {
    if (!order) return;
    try {
        const orderRef = doc(db, 'serviceOrders', order.id);
        await updateDoc(orderRef, { priority: newPriority });
        toast({ title: "Sucesso!", description: "Prioridade da O.S. atualizada." });
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao atualizar a prioridade." });
    }
  };

  const handleCancelOrder = async () => {
    const canceledStatus = settings.serviceStatuses?.find(s => s.id === 'canceled')?.name || 'Cancelada';
    await handleStatusChange(canceledStatus);
    setIsCancelAlertOpen(false);
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

 const handleSendWhatsApp = () => {
    if (!order || !customerPhone) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Número de telefone do cliente não encontrado.' });
        return;
    }

    let sanitizedPhone = customerPhone.replace(/\D/g, '');
    if (sanitizedPhone.length <= 11) { // Assume BR country code for local numbers
        sanitizedPhone = `55${sanitizedPhone}`;
    }

    const pdfLink = `${window.location.origin}/print/servico/${order.id}`;
    const message = `Olá, ${order.clientName}! Segue a sua Ordem de Serviço referente a: "${order.serviceType}". Você pode acessá-la no link: ${pdfLink}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast({ title: "Redirecionando", description: "Abrindo o WhatsApp em uma nova aba." });
  };
  
  const handleSaveAsTemplate = async ({templateName}: TemplateFormValues) => {
    if (!order || !user) return;
    try {
        const templateData = { ...order, isTemplate: true, templateName };
        
        delete (templateData as any).id;
        delete (templateData as any).clientId;
        delete (templateData as any).clientName;
        delete (templateData as any).activityLog;
        delete (templateData as any).originalServiceOrderId;
        delete (templateData as any).version;

        await addDoc(collection(db, 'serviceOrders'), templateData);

        toast({ title: 'Sucesso!', description: 'Modelo de serviço salvo.' });
        setIsTemplateModalOpen(false);
        router.push('/dashboard/servicos/modelos');
    } catch (error) {
        console.error("Error saving service template:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o modelo de serviço.' });
    }
  };


  const renderPreview = (file: { name: string; url: string; } | null) => {
    if (!file) return null;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];

    if (fileExtension === 'pdf') {
      return <iframe src={file.url} className="w-full h-full border-0" title={file.name} allow="fullscreen" />;
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
  
  const canceledStatus = settings.serviceStatuses?.find(s => s.id === 'canceled')?.name || 'Cancelada';
  const completedStatus = settings.serviceStatuses?.find(s => s.id === 'completed')?.name || 'Concluída';
  
  const canManage = order.status !== canceledStatus;
  const canCreateNewVersion = order.status !== completedStatus && order.status !== canceledStatus;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/servicos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <Wrench className='h-5 w-5' />
            Detalhes da OS (v{order.version || 1})
        </h1>
        <StatusBadge status={order.status} />
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{order.serviceType}</CardTitle>
                    {order.generatedByAgreementId && 
                        <Badge variant="outline" className="gap-1.5"><FileSignature className="h-3.5 w-3.5" />Gerada por Contrato</Badge>
                    }
                </div>
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
                            <Link href={`/dashboard/base-de-clientes/${order.clientId}`} className="font-medium hover:underline">{order.clientName}</Link>
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
                            <Select value={order.collaboratorId} onValueChange={handleCollaboratorChange} disabled={!canManage}>
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
                                        disabled={!canManage}
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
                            <Select value={order.status} onValueChange={(val) => handleStatusChange(val)} disabled={!canManage}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {settings.serviceStatuses?.map(status => (
                                        <SelectItem key={status.id} value={status.name}>{status.name}</SelectItem>
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
               <CardFooter className="justify-end gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleSendWhatsApp} disabled={!customerPhone}>
                        <WhatsAppIcon />
                        Enviar por WhatsApp
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                        <Link href={`/print/servico/${order.id}`} target="_blank">
                            <Printer className="mr-2 h-4 w-4"/>
                            Imprimir / PDF
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" disabled={!canCreateNewVersion} asChild>
                      <Link href={`/dashboard/servicos/criar?versionOf=${order.id}`}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsTemplateModalOpen(true)}>
                      <Save className="mr-2 h-4 w-4" /> Salvar como Modelo
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsCancelAlertOpen(true)} disabled={!canManage}>
                      <Trash2 className="mr-2 h-4 w-4" /> Cancelar OS
                    </Button>
                </CardFooter>
            </Card>

             {settings.serviceOrderCustomFields && order.customFields && Object.keys(order.customFields).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Informações Adicionais</CardTitle>
                        <CardDescription>Campos personalizados para esta ordem de serviço.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                       {settings.serviceOrderCustomFields
                           .filter(field => order.customFields && order.customFields[field.id])
                           .map((field) => {
                               const value = order.customFields![field.id];
                               if (!value) return null;

                               const fieldType = field.type;
                               let displayValue = value;
                               if (fieldType === 'date' && value && typeof value === 'object' && 'seconds' in value) {
                                   displayValue = format((value as any).toDate(), 'dd/MM/yyyy');
                               }
                               return (
                                   <div key={field.id} className="flex flex-col">
                                       <p className="text-sm font-medium">{field.name}</p>
                                       <p className="text-muted-foreground">{String(displayValue) || 'Não informado'}</p>
                                   </div>
                               );
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

          <div className='lg:col-span-1 flex flex-col gap-6'>
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2"><Paperclip/> Anexos</CardTitle>
                <CardDescription>Adicione e visualize fotos e documentos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="picture">Adicionar anexo</Label>
                    <Input id="picture" type="file" onChange={handleFileUpload} disabled={isUploading || !canManage}/>
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

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico de Versões</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {serviceOrderVersions.length > 0 ? (
                        serviceOrderVersions.map(v => (
                            <Link key={v.id} href={`/dashboard/servicos/${v.id}`}>
                                <div className={cn(
                                    "p-3 rounded-md border cursor-pointer",
                                    v.id === order.id ? "bg-muted border-primary" : "hover:bg-muted/50"
                                )}>
                                    <div className="flex justify-between items-center font-medium">
                                        <span>Versão {v.version}</span>
                                        <Badge style={{backgroundColor: getStatusColor(v.status), color: 'hsl(var(--primary-foreground))'}} className="border-transparent">{v.status}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                        <span>{format(v.createdAt.toDate(), 'dd/MM/yy')}</span>
                                        <span>{v.collaboratorName}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">Nenhuma outra versão encontrada.</p>
                    )}
                </CardContent>
            </Card>
          </div>
      </div>

       <Dialog open={!!previewFile} onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Pré-visualização do anexo {previewFile?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow h-full w-full overflow-auto bg-muted/50 rounded-md">
            {renderPreview(previewFile)}
          </div>
        </DialogContent>
      </Dialog>
      
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Salvar como Modelo de Serviço</DialogTitle>
                    <DialogDescription>
                        Dê um nome para este modelo para usá-lo facilmente no futuro.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...templateForm}>
                    <form onSubmit={templateForm.handleSubmit(handleSaveAsTemplate)} className="space-y-4">
                       <FormField
                        control={templateForm.control}
                        name="templateName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Modelo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Instalação Padrão de Câmera" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsTemplateModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={templateForm.formState.isSubmitting}>
                                {templateForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Modelo
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação irá alterar o status da ordem de serviço para "{canceledStatus}". Esta ação pode ser revertida manually.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelOrder} className="bg-destructive hover:bg-destructive/90">
                        Sim, cancelar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
