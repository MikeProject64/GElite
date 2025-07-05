
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import Link from 'next/link';
import { format } from 'date-fns';
import Image from 'next/image';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Briefcase, Eye, Building2, User, Upload, Trash2 } from 'lucide-react';
import { ServiceOrder, Collaborator } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Concluída': return 'default';
    case 'Cancelada': return 'destructive';
    default:
        const hash = status.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
        return (Math.abs(hash) % 2 === 0) ? 'secondary' : 'outline';
  }
};

export default function ColaboradorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();

  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const collaboratorId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!user || !collaboratorId) return;

    setIsLoading(true);

    const collaboratorRef = doc(db, 'collaborators', collaboratorId);
    const unsubscribeCollab = onSnapshot(collaboratorRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().userId === user.uid) {
        setCollaborator({ id: docSnap.id, ...docSnap.data() } as Collaborator);
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Colaborador não encontrado.' });
        router.push('/dashboard/colaboradores');
      }
    });

    const ordersQuery = query(
      collection(db, 'serviceOrders'),
      where('userId', '==', user.uid),
      where('collaboratorId', '==', collaboratorId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder));
      setServiceOrders(orders);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching service orders for collaborator:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar o histórico de serviços.' });
        setIsLoading(false);
    });

    return () => {
      unsubscribeCollab();
      unsubscribeOrders();
    };
  }, [user, collaboratorId, router, toast]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !collaborator || collaborator.type !== 'collaborator' || !user) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      // Delete old photo if it exists
      if (collaborator.photoURL) {
        try {
            const oldPhotoRef = ref(storage, collaborator.photoURL);
            await deleteObject(oldPhotoRef);
        } catch (error: any) {
             if (error.code !== 'storage/object-not-found') {
                console.warn("Could not delete old photo:", error);
             }
        }
      }

      const storageRef = ref(storage, `collaborators/${collaborator.id}/${file.name}`);
       // Add user ID to file metadata for security rule verification
      const metadata = {
        customMetadata: {
          'userId': user.uid,
        },
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const collaboratorRef = doc(db, 'collaborators', collaborator.id);
      await updateDoc(collaboratorRef, { photoURL: downloadURL });

      toast({ title: 'Sucesso!', description: 'Foto atualizada.' });
    } catch (error) {
      console.error("Photo upload error:", error);
      toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Falha ao enviar a foto.' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-48" /></div>
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="md:col-span-2 h-80" />
        </div>
      </div>
    );
  }

  if (!collaborator) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/colaboradores"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <Briefcase className='h-5 w-5' />
            Detalhes de: {collaborator.name}
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-1">
            <CardHeader className="items-center text-center">
                <Avatar className="w-24 h-24 text-lg border">
                    <AvatarImage src={collaborator.photoURL} alt={collaborator.name} className="object-cover"/>
                    <AvatarFallback>
                        {collaborator.type === 'collaborator' ? <User className="h-10 w-10"/> : <Building2 className="h-10 w-10"/>}
                    </AvatarFallback>
                </Avatar>
                <CardTitle className="pt-2">{collaborator.name}</CardTitle>
                <CardDescription className='capitalize'>{collaborator.type === 'collaborator' ? 'Colaborador' : 'Setor'}</CardDescription>
            </CardHeader>
            <CardContent className='text-center'>
                <p className="text-sm text-muted-foreground">{collaborator.description || 'Nenhuma descrição informada.'}</p>
            </CardContent>
            {collaborator.type === 'collaborator' && (
                <CardFooter className='flex-col gap-2'>
                    <Label htmlFor="photo-upload" className="w-full">
                        <Button className="w-full" variant="outline" asChild>
                            <span><Upload className="mr-2 h-4 w-4"/> Mudar Foto</span>
                        </Button>
                    </Label>
                    <Input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading}/>
                    {isUploading && <p className='text-sm text-muted-foreground flex items-center gap-2'><Loader2 className='h-4 w-4 animate-spin' /> Enviando...</p>}
                </CardFooter>
            )}
        </Card>
        
        <Card className="lg:col-span-2">
            <CardHeader>
            <CardTitle>Ordens de Serviço Atribuídas</CardTitle>
            <CardDescription>Serviços sob a responsabilidade de {collaborator.name}.</CardDescription>
            </CardHeader>
            <CardContent>
            {serviceOrders.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Serviço / Cliente</TableHead>
                        <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {serviceOrders.map(order => (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/servicos/${order.id}`)}>
                        <TableCell>
                            <span className="font-mono text-sm font-medium hover:underline">
                                #{order.id.substring(0, 6).toUpperCase()}
                            </span>
                        </TableCell>
                        <TableCell>
                            <span className="font-medium hover:underline">{order.serviceType}</span>
                            <div className="text-sm text-muted-foreground">{order.clientName}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{order.dueDate ? format(order.dueDate.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                        <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            ) : (
                <p className="text-center text-muted-foreground py-10">Nenhuma ordem de serviço encontrada para este item.</p>
            )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
