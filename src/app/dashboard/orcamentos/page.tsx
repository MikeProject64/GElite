

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp, orderBy, doc, updateDoc, runTransaction, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format } from 'date-fns';
import { Quote, ServiceOrder } from '@/types';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, FileText, Filter, Eye, Copy, Trash2, LayoutTemplate, X, CalendarIcon, CheckCircle2, Thermometer, ChevronLeft, ChevronRight, Paperclip, FileSignature } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';


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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

function OrcamentosPageComponent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [filters, setFilters] = useState({ 
    status: '', 
    clientName: '',
    createdAt: undefined as DateRange | undefined
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [conversionAlertData, setConversionAlertData] = useState<Quote | null>(null);

  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setFilters(prev => ({ ...prev, status: statusFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    const q = query(collection(db, 'quotes'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const quoteList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Quote)).filter(q => !q.isTemplate);
      setQuotes(quoteList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching quotes: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar os orçamentos.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  const handleStatusChange = async (quoteId: string, currentStatus: Quote['status'], newStatus: Quote['status']) => {
    if (currentStatus === newStatus) return;
    try {
      const quoteRef = doc(db, 'quotes', quoteId);
      await updateDoc(quoteRef, { status: newStatus });
      toast({ title: 'Sucesso!', description: 'Status do orçamento atualizado.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o status.' });
    }
  };

  const handleConvert = async () => {
    if (!conversionAlertData || !user || !user.email) return;

    const quote = conversionAlertData;
    setIsConverting(quote.id);

    try {
      const serviceOrderId = await runTransaction(db, async (transaction) => {
        const freshQuoteRef = doc(db, 'quotes', quote.id);
        const freshQuoteSnap = await transaction.get(freshQuoteRef);
        if (!freshQuoteSnap.exists()) {
          throw new Error("Orçamento não encontrado.");
        }
        const freshQuote = freshQuoteSnap.data() as Quote;
        if (freshQuote.convertedToServiceOrderId) {
          throw new Error("Este orçamento já foi convertido.");
        }

        const newServiceOrderRef = doc(collection(db, 'serviceOrders'));
        const serviceOrderData: Omit<ServiceOrder, 'id'> = {
          userId: user.uid,
          clientId: quote.clientId,
          clientName: quote.clientName,
          serviceType: quote.title,
          problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
          collaboratorId: '', 
          collaboratorName: '',
          totalValue: quote.totalValue,
          status: 'Pendente',
          priority: 'media',
          dueDate: Timestamp.fromDate(new Date()),
          attachments: [],
          createdAt: Timestamp.now(),
          completedAt: null,
          customFields: quote.customFields || {},
          activityLog: [{
            timestamp: Timestamp.now(),
            userEmail: user.email || 'Sistema',
            description: `Ordem de Serviço criada a partir do orçamento #${quote.id.substring(0,6).toUpperCase()}`
          }],
          isTemplate: false,
          originalServiceOrderId: newServiceOrderRef.id,
          version: 1,
          source: { type: 'quote', id: quote.id },
        };
        transaction.set(newServiceOrderRef, serviceOrderData);

        const logEntry = {
          timestamp: Timestamp.now(),
          userEmail: user.email || 'Sistema',
          description: `Orçamento convertido para a OS #${newServiceOrderRef.id.substring(0,6).toUpperCase()}`
        };
        transaction.update(freshQuoteRef, {
          status: 'Convertido',
          convertedToServiceOrderId: newServiceOrderRef.id,
          activityLog: arrayUnion(logEntry)
        });

        return newServiceOrderRef.id;
      });

      toast({ title: 'Sucesso!', description: 'Orçamento convertido em Ordem de Serviço.' });
      
    } catch (error: any) {
      console.error("[CONVERT_QUOTE] CATCH BLOCK: An error occurred during conversion.", error);
      toast({ variant: 'destructive', title: 'Erro ao Converter', description: error.message || 'Falha ao converter o orçamento.' });
    } finally {
      setIsConverting(null);
      setConversionAlertData(null);
    }
  }


  const latestQuotes = useMemo(() => {
    if (quotes.length === 0) return [];
    
    const quotesByOriginalId = new Map<string, Quote>();

    quotes.forEach(quote => {
        const originalId = quote.originalQuoteId || quote.id;
        const existing = quotesByOriginalId.get(originalId);

        if (!existing || (quote.version || 1) > (existing.version || 1)) {
            quotesByOriginalId.set(originalId, quote);
        }
    });

    return Array.from(quotesByOriginalId.values());
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return latestQuotes.filter(quote => {
        const statusMatch = filters.status ? quote.status === filters.status : true;
        const clientMatch = filters.clientName ? quote.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) : true;
        
        let dateMatch = true;
        if (filters.createdAt && quote.createdAt) {
            const quoteCreationDate = quote.createdAt.toDate();
            if (filters.createdAt.from) dateMatch &&= (quoteCreationDate >= filters.createdAt.from);
            if (filters.createdAt.to) dateMatch &&= (quoteCreationDate <= filters.createdAt.to);
        }

        return statusMatch && clientMatch && dateMatch;
    });
  }, [latestQuotes, filters]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, itemsPerPage]);

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuotes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuotes, currentPage, itemsPerPage]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  
  const isAnyFilterActive = Object.values(filters).some(value => value !== '' && value !== undefined);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Orçamentos</h1>
          <div className='flex gap-2'>
              <Button size="sm" variant="outline" className="h-8 gap-1" asChild>
                  <Link href="/dashboard/orcamentos/modelos">
                      <LayoutTemplate className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Modelos
                      </span>
                  </Link>
              </Button>
              <Button size="sm" className="h-8 gap-1" asChild>
                  <Link href="/dashboard/orcamentos/criar">
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Novo Orçamento
                      </span>
                  </Link>
              </Button>
          </div>
        </div>

        <Card>
            <CardHeader>
              <CardTitle>
                  <span className="flex items-center gap-2">
                      <Filter className="h-5 w-5"/>
                      Filtros de Orçamentos
                  </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="client-filter">Filtrar por Cliente</Label>
                  <Input id="client-filter" placeholder="Nome do cliente..." value={filters.clientName} onChange={e => handleFilterChange('clientName', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status-filter">Filtrar por Status</Label>
                  <Select value={filters.status} onValueChange={value => handleFilterChange('status', value === 'all' ? '' : value)}>
                      <SelectTrigger id="status-filter">
                          <SelectValue placeholder="Todos os Status" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todos os Status</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Aprovado">Aprovado</SelectItem>
                          <SelectItem value="Recusado">Recusado</SelectItem>
                          <SelectItem value="Convertido">Convertido</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date-filter">Filtrar por Data de Criação</Label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button id="date-filter" variant="outline" className={cn("justify-start text-left font-normal", !filters.createdAt && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.createdAt?.from ? (
                                  filters.createdAt.to ? (
                                      <>
                                          {format(filters.createdAt.from, "dd/MM/yy")} - {format(filters.createdAt.to, "dd/MM/yy")}
                                      </>
                                  ) : (
                                      format(filters.createdAt.from, "dd/MM/yyyy")
                                  )
                              ) : (
                                  <span>Selecione um período</span>
                              )}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="range" selected={filters.createdAt} onSelect={(range) => handleFilterChange('createdAt', range)} numberOfMonths={2} />
                      </PopoverContent>
                  </Popover>
              </div>
            </CardContent>
          </Card>
          
          {isAnyFilterActive && (
              <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Filtros ativos:</span>
                  {filters.status && <Badge variant="secondary" className="gap-1">Status: {filters.status} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('status', '')}><X className="h-3 w-3"/></Button></Badge>}
                  {filters.clientName && <Badge variant="secondary" className="gap-1">Cliente: {filters.clientName} <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('clientName', '')}><X className="h-3 w-3"/></Button></Badge>}
                  {filters.createdAt && <Badge variant="secondary" className="gap-1">Data <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleFilterChange('createdAt', undefined)}><X className="h-3 w-3"/></Button></Badge>}
              </div>
          )}

        <Card>
          <CardHeader>
            <CardTitle>Gestão de Propostas e Orçamentos</CardTitle>
            <CardDescription>Crie, envie e acompanhe o status de seus orçamentos.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paginatedQuotes.length === 0 ? (
              <div className="text-center py-10">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum orçamento encontrado.</h3>
                  <p className="text-sm text-muted-foreground">{isAnyFilterActive ? "Tente um filtro diferente." : "Que tal criar o primeiro?"}</p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>ID (Versão)</TableHead>
                      <TableHead>Título / Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Valor Total</TableHead>
                      <TableHead className="hidden lg:table-cell">Criação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                      <TableCell>
                          <Link href={`/dashboard/orcamentos/${quote.id}`} className="font-mono text-sm font-medium hover:underline">
                            #{quote.id.substring(0, 6).toUpperCase()} (v{quote.version || 1})
                          </Link>
                        </TableCell>
                      <TableCell>
                          <Link href={`/dashboard/orcamentos/${quote.id}`} className="font-medium hover:underline" title={quote.title}>
                              {quote.title}
                          </Link>
                          <div className="text-sm text-muted-foreground">
                              <Link href={`/dashboard/base-de-clientes/${quote.clientId}`} className="hover:underline" title="Ver detalhes do cliente">
                                  {quote.clientName}
                              </Link>
                          </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatCurrency(quote.totalValue)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{format(quote.createdAt.toDate(), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                          {quote.status === 'Convertido' && quote.convertedToServiceOrderId ? (
                              <Button asChild variant="link" className="p-0 h-auto font-medium">
                                  <Link href={`/dashboard/servicos/${quote.convertedToServiceOrderId}`}>
                                      OS #{quote.convertedToServiceOrderId.substring(0,6).toUpperCase()}
                                  </Link>
                              </Button>
                          ) : (
                              <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                          )}
                      </TableCell>
                      <TableCell>
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end"><DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => router.push(`/dashboard/orcamentos/${quote.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" /> Ver / Gerenciar
                              </DropdownMenuItem>
                              {quote.status === 'Aprovado' && (
                                  <DropdownMenuItem onSelect={() => setConversionAlertData(quote)} disabled={isConverting === quote.id}>
                                      {isConverting === quote.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                                      Converter em OS
                                  </DropdownMenuItem>
                              )}
                              <DropdownMenuSub>
                                  <DropdownMenuSubTrigger disabled={quote.status === 'Convertido'}>
                                      <CheckCircle2 className="mr-2 h-4 w-4"/>
                                      <span>Alterar Status</span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                      <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => handleStatusChange(quote.id, quote.status, 'Pendente')} disabled={quote.status === 'Pendente'}>Pendente</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusChange(quote.id, quote.status, 'Aprovado')} disabled={quote.status === 'Aprovado'}>Aprovado</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleStatusChange(quote.id, quote.status, 'Recusado')} disabled={quote.status === 'Recusado'}>Recusado</DropdownMenuItem>
                                      </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                              </DropdownMenuSub>
                          </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                      </TableRow>
                  ))}
                  </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
          <CardFooter>
              <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                      <span>Linhas por página:</span>
                      <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                          <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <span>Página {currentPage} de {totalPages}</span>
                  <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading}>
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages || isLoading}>
                          Próximo
                          <ChevronRight className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
          </CardFooter>
        </Card>
      </div>

       <AlertDialog open={!!conversionAlertData} onOpenChange={(open) => !open && setConversionAlertData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Conversão</AlertDialogTitle>
            <AlertDialogDescription>
              Isso criará uma nova Ordem de Serviço com base no orçamento para "{conversionAlertData?.clientName}". Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvert}>Sim, Converter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function OrcamentosPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <OrcamentosPageComponent />
        </Suspense>
    )
}
