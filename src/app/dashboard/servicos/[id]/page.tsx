
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Calendar, Wrench, Thermometer, UserCheck, Paperclip, Upload, File, Loader2 } from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
}

interface ServiceOrder {
  id: string;
  clientName: string;
  serviceType: string;
  problemDescription: string;
  technician: string;
  status: 'Pendente' | 'Em Andamento' | 'Aguardando Peça' | 'Concluída' | 'Cancelada';
  createdAt: Timestamp;
  dueDate: Timestamp;
  attachments?: Attachment[];
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Em Andamento': return 'secondary';
    case 'Cancelada': return 'destructive';
    default: return 'outline';
  }
};

export default function ServicoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleStatusChange = async (newStatus: ServiceOrder['status']) => {
    if (!order) return;
    try {
      const orderRef = doc(db, 'serviceOrders', order.id);
      await updateDoc(orderRef, { status: newStatus });
      toast({ title: 'Sucesso!', description: 'Status da ordem de serviço atualizado.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o status.' });
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !order) return;
    
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
    } catch (error) {
      console.error("File upload error:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao anexar o arquivo.' });
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
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
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
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
                      <UserCheck className="h-5 w-5 text-muted-foreground" />
                      <div>
                          <p className="text-sm text-muted-foreground">Técnico</p>
                          <p className="font-medium">{order.technician}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                          <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                          <p className="font-medium">{format(order.dueDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
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
                                  <SelectItem value="Pendente">Pendente</SelectItem>
                                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                                  <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                                  <SelectItem value="Concluída">Concluída</SelectItem>
                                  <SelectItem value="Cancelada">Cancelada</SelectItem>
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
          </Card>

          <Card>
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
