
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Quote } from '@/types';
import { useAuth } from '@/components/auth-provider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Calendar, FileText, CheckCircle2, XCircle, Copy, Loader2, Thermometer } from 'lucide-react';

const getStatusVariant = (status: Quote['status']) => {
  switch (status) {
    case 'Aprovado': return 'default';
    case 'Pendente': return 'secondary';
    case 'Recusado': return 'destructive';
    case 'Convertido': return 'outline';
    default: return 'outline';
  }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function OrcamentoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const quoteId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!quoteId) return;
    setIsLoading(true);
    const quoteRef = doc(db, 'quotes', quoteId);
    const unsubscribe = onSnapshot(quoteRef, (docSnap) => {
      if (docSnap.exists()) {
        setQuote({ id: docSnap.id, ...docSnap.data() } as Quote);
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Orçamento não encontrado.' });
        router.push('/dashboard/orcamentos');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [quoteId, router, toast]);

  const handleStatusChange = async (newStatus: Quote['status']) => {
    if (!quote) return;
    try {
      const quoteRef = doc(db, 'quotes', quote.id);
      await updateDoc(quoteRef, { status: newStatus });
      toast({ title: 'Sucesso!', description: 'Status do orçamento atualizado.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o status.' });
    }
  };

  const convertToServiceOrder = async () => {
    if (!quote || !user) return;
    setIsConverting(true);
    try {
        const serviceOrderData = {
            clientId: quote.clientId,
            clientName: quote.clientName,
            problemDescription: `Serviços baseados no orçamento #${quote.id.substring(0, 6)}:\n\n${quote.description}`,
            serviceType: "Serviço a partir de orçamento",
            technician: "A definir",
            status: 'Pendente',
            dueDate: Timestamp.fromDate(new Date()), // Define a default due date
            attachments: [],
            userId: user.uid,
            createdAt: Timestamp.now(),
        };
        await addDoc(collection(db, 'serviceOrders'), serviceOrderData);
        
        const quoteRef = doc(db, 'quotes', quote.id);
        await updateDoc(quoteRef, { status: 'Convertido' });

        toast({ title: 'Sucesso!', description: 'Orçamento convertido em Ordem de Serviço.' });
        router.push('/dashboard/servicos');
    } catch (error) {
        console.error("Conversion error:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao converter o orçamento.' });
    } finally {
        setIsConverting(false);
        setIsAlertOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4"><Skeleton className="h-7 w-7" /><Skeleton className="h-7 w-48" /></div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/orcamentos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <FileText className='h-5 w-5' />
            Detalhes do Orçamento
        </h1>
        <Badge variant={getStatusVariant(quote.status)} className="text-base px-3 py-1">{quote.status}</Badge>
      </div>
      
      <Card>
          <CardHeader>
            <CardTitle>Proposta para {quote.clientName}</CardTitle>
            <CardDescription>
              Criado em: {format(quote.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Cliente</p>
                        <p className="font-medium">{quote.clientName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm text-muted-foreground">Válido até</p>
                        <p className="font-medium">{format(quote.validUntil.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                  <Thermometer className="h-5 w-5 text-muted-foreground" />
                   <div>
                        <p className="text-sm text-muted-foreground">Atualizar Status</p>
                        <Select value={quote.status} onValueChange={(val) => handleStatusChange(val as Quote['status'])} disabled={quote.status === 'Convertido'}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pendente">Pendente</SelectItem>
                                <SelectItem value="Aprovado">Aprovado</SelectItem>
                                <SelectItem value="Recusado">Recusado</SelectItem>
                            </SelectContent>
                        </Select>
                   </div>
                </div>
             </div>

            <div>
                <h3 className="font-medium mb-2">Descrição dos Itens</h3>
                <p className="text-muted-foreground bg-secondary/50 p-4 rounded-md whitespace-pre-wrap">{quote.description}</p>
            </div>
            
             <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(quote.totalValue)}</p>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
                {quote.status === 'Aprovado' && (
                     <Button onClick={() => setIsAlertOpen(true)} disabled={isConverting}>
                        {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Copy className="mr-2 h-4 w-4"/>}
                        Converter em Ordem de Serviço
                    </Button>
                )}
          </CardFooter>
        </Card>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Conversão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Isso criará uma nova Ordem de Serviço com base neste orçamento e marcará o orçamento como "Convertido". Deseja continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={convertToServiceOrder}>Sim, converter</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
