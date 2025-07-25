
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, addDoc, collection, Timestamp, query, where, orderBy, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Quote, Customer } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Calendar, FileText, CheckCircle2, XCircle, Copy, Loader2, Thermometer, Info, Printer, DollarSign, Save, Pencil, History } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';


const templateFormSchema = z.object({
  templateName: z.string().min(3, { message: 'O nome do modelo deve ter pelo menos 3 caracteres.' }),
});
type TemplateFormValues = z.infer<typeof templateFormSchema>;

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-2 h-4 w-4" viewBox="0 0 16 16">
        <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
    </svg>
);


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
  const { settings } = useSettings();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [quoteVersions, setQuoteVersions] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRecusarAlertOpen, setIsRecusarAlertOpen] = useState(false);

  const quoteId = Array.isArray(id) ? id[0] : id;
  
  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { templateName: '' },
  });

  useEffect(() => {
    if (!quoteId || !user) return;
    setIsLoading(true);
    const quoteRef = doc(db, 'quotes', quoteId);
    const unsubscribe = onSnapshot(quoteRef, (docSnap) => {
      if (docSnap.exists()) {
        const quoteData = { id: docSnap.id, ...docSnap.data() } as Quote;
        if (quoteData.isTemplate) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Este é um modelo, não um orçamento.' });
            router.push('/dashboard/orcamentos/modelos');
            return;
        }
        setQuote(quoteData);

        const originalId = quoteData.originalQuoteId || quoteData.id;
        const versionsQuery = query(
            collection(db, 'quotes'),
            where('userId', '==', user.uid),
            where('originalQuoteId', '==', originalId),
            orderBy('version', 'desc')
        );
        onSnapshot(versionsQuery, (versionSnap) => {
            const versions = versionSnap.docs.map(d => ({id: d.id, ...d.data()}) as Quote);
            setQuoteVersions(versions);
        });

      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Orçamento não encontrado.' });
        router.push('/dashboard/orcamentos');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [quoteId, router, toast, user]);

  useEffect(() => {
    if (quote?.clientId) {
        const customerRef = doc(db, 'customers', quote.clientId);
        getDoc(customerRef).then(customerSnap => {
            if (customerSnap.exists()) {
                const customerData = customerSnap.data() as Customer;
                setCustomerPhone(customerData.phone || null);
            }
        });
    }
  }, [quote?.clientId]);

  const handleStatusChange = async (newStatus: Quote['status']) => {
    if (!quote) return;
    try {
      const quoteRef = doc(db, 'quotes', quote.id);
      await updateDoc(quoteRef, { status: newStatus });
      
      if (newStatus === 'Aprovado') {
        toast({
          title: 'Orçamento Aprovado!',
          description: 'Lembre-se de convertê-lo em uma Ordem de Serviço para dar andamento.',
          duration: 6000,
        });
      } else {
        toast({ title: 'Sucesso!', description: 'Status do orçamento atualizado.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o status.' });
    }
  };
  
  const handleRecusarQuote = async () => {
    await handleStatusChange('Recusado');
    setIsRecusarAlertOpen(false);
  }

  const convertToServiceOrder = async () => {
    if (!quote || !user) return;
    setIsConverting(true);
    try {
        const serviceOrderData = {
            clientId: quote.clientId,
            clientName: quote.clientName,
            problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
            serviceType: quote.title,
            status: 'Pendente', // Default status for new OS
            collaboratorId: '', // Needs to be assigned
            dueDate: Timestamp.fromDate(new Date()),
            totalValue: quote.totalValue,
            attachments: [],
            userId: user.uid,
            createdAt: Timestamp.now(),
            customFields: quote.customFields || {},
            completedAt: null,
            isTemplate: false,
            activityLog: [{
                timestamp: Timestamp.now(),
                userEmail: user?.email || 'Sistema',
                description: `Ordem de Serviço criada a partir do orçamento #${quote.id.substring(0, 6).toUpperCase()}`
            }],
        };
        const docRef = await addDoc(collection(db, 'serviceOrders'), serviceOrderData);
        
        const quoteRef = doc(db, 'quotes', quote.id);
        await updateDoc(quoteRef, { status: 'Convertido' });

        toast({ title: 'Sucesso!', description: 'Orçamento convertido em Ordem de Serviço.' });
        router.push(`/dashboard/servicos/${docRef.id}`);
    } catch (error) {
        console.error("Conversion error:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao converter o orçamento.' });
    } finally {
        setIsConverting(false);
        setIsAlertOpen(false);
    }
  };

  const handleSaveAsTemplate = async ({templateName}: TemplateFormValues) => {
    if (!quote || !user) return;
    try {
        const templateData = {
            ...quote,
            isTemplate: true,
            templateName: templateName,
            status: 'Pendente',
        };
        delete (templateData as any).id;
        delete (templateData as any).clientId;
        delete (templateData as any).clientName;
        delete (templateData as any).originalQuoteId;
        delete (templateData as any).version;
        
        await addDoc(collection(db, 'quotes'), templateData);

        toast({ title: 'Sucesso!', description: 'Modelo de orçamento salvo.' });
        setIsTemplateModalOpen(false);
        router.push('/dashboard/orcamentos/modelos');
    } catch (error) {
        console.error("Error saving template:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o modelo.' });
    }
  };

  const handleSendWhatsApp = () => {
    if (!quote || !customerPhone) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Número de telefone do cliente não encontrado.' });
        return;
    }

    let sanitizedPhone = customerPhone.replace(/\D/g, '');
    if (sanitizedPhone.length <= 11) { // Assume BR country code for local numbers
        sanitizedPhone = `55${sanitizedPhone}`;
    }

    const pdfLink = `${window.location.origin}/print/orcamento/${quote.id}`;
    const message = `Olá, ${quote.clientName}! Segue o seu orçamento: "${quote.title}". Você pode acessá-lo no link: ${pdfLink}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast({ title: "Redirecionando", description: "Abrindo o WhatsApp em uma nova aba." });
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

  const canCreateNewVersion = quote.status === 'Pendente' || quote.status === 'Recusado';
  const canBeManaged = quote.status !== 'Convertido';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" asChild>
          <Link href="/dashboard/orcamentos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
            <FileText className='h-5 w-5' />
            Detalhes do Orçamento (v{quote.version || 1})
        </h1>
        <Badge variant={getStatusVariant(quote.status)} className="text-base px-3 py-1">{quote.status}</Badge>
      </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
            <CardHeader>
                <CardTitle>{quote.title}</CardTitle>
                <CardDescription>
                  Proposta para <Link href={`/dashboard/base-de-clientes/${quote.clientId}`} className="font-medium text-primary hover:underline">{quote.clientName}</Link> | Criado em: {format(quote.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR })}
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
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Valor Total</p>
                            <p className="font-medium">{formatCurrency(quote.totalValue)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                    <Thermometer className="h-5 w-5 text-muted-foreground" />
                    <div>
                            <p className="text-sm text-muted-foreground">Atualizar Status</p>
                            <Select value={quote.status} onValueChange={(val) => handleStatusChange(val as Quote['status'])} disabled={!canBeManaged}>
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
                
            </CardContent>
            <CardFooter className="justify-end gap-2 flex-wrap">
                 {quote.status === 'Pendente' && (
                  <Button variant="destructive" size="sm" onClick={() => setIsRecusarAlertOpen(true)}>
                    <XCircle className="mr-2 h-4 w-4" /> Recusar
                  </Button>
                )}
                 <Button variant="outline" size="sm" onClick={handleSendWhatsApp} disabled={!customerPhone}>
                    <WhatsAppIcon />
                    Enviar por WhatsApp
                </Button>
                <Button variant="outline" size="sm" disabled={!canCreateNewVersion} asChild>
                    <Link href={`/dashboard/orcamentos/criar?versionOf=${quote.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar / Criar Nova Versão
                    </Link>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsTemplateModalOpen(true)}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar como Modelo
                </Button>
                <Button variant="secondary" size="sm" onClick={() => window.open(`/print/orcamento/${quote.id}`, '_blank')}>
                  <Printer className="mr-2 h-4 w-4"/>
                  Imprimir / PDF
                </Button>
                {quote.status === 'Aprovado' && (
                    <Button onClick={() => setIsAlertOpen(true)} disabled={isConverting}>
                        {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Copy className="mr-2 h-4 w-4"/>}
                        Converter em Ordem de Serviço
                    </Button>
                )}
            </CardFooter>
            </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
            {settings.quoteCustomFields && quote.customFields && Object.keys(quote.customFields).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Informações Adicionais</CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-1 gap-4">
                       {settings.quoteCustomFields
                           .filter(field => quote.customFields && quote.customFields[field.id])
                           .map((field) => {
                               const value = quote.customFields![field.id];
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
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico de Versões</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {quoteVersions.length > 0 ? (
                        quoteVersions.map(v => (
                            <Link key={v.id} href={`/dashboard/orcamentos/${v.id}`}>
                                <div className={cn(
                                    "p-3 rounded-md border cursor-pointer",
                                    v.id === quote.id ? "bg-muted border-primary" : "hover:bg-muted/50"
                                )}>
                                    <div className="flex justify-between items-center font-medium">
                                        <span>Versão {v.version}</span>
                                        <span>{formatCurrency(v.totalValue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                                        <span>{format(v.createdAt.toDate(), 'dd/MM/yy')}</span>
                                        <Badge variant={getStatusVariant(v.status)}>{v.status}</Badge>
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

        <AlertDialog open={isRecusarAlertOpen} onOpenChange={setIsRecusarAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Recusa</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação alterará o status do orçamento para "Recusado". Esta ação pode ser revertida. Deseja continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRecusarQuote} className="bg-destructive hover:bg-destructive/90">Sim, recusar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Salvar como Modelo de Orçamento</DialogTitle>
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
                              <Input placeholder="Ex: Instalação de Câmeras (Kit Básico)" {...field} />
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
    </div>
  );
}
