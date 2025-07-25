

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp, orderBy, doc, updateDoc, runTransaction, addDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format } from 'date-fns';
import { Quote, ServiceOrder, Client } from '@/types';
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
import { Loader2, MoreHorizontal, PlusCircle, FileText, Filter, Eye, Copy, Trash2, LayoutTemplate, X, CalendarIcon, CheckCircle2, Thermometer, ChevronLeft, ChevronRight, Paperclip, FileSignature, Wrench, Pencil, ChevronsUpDown, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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

function SearchableSelect({ value, onValueChange, options, placeholder }: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const currentLabel = options.find(option => option.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal text-left">
          <span className="truncate">
            {currentLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Pesquisar..." />
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          <CommandList>
            <CommandGroup>
               <CommandItem key="all" value="all" onSelect={() => { onValueChange(''); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    Todos
                </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => { onValueChange(option.value === value ? '' : option.value); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


function OrcamentosPageComponent() {
  const { user, activeAccountId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  const [filters, setFilters] = useState({ 
    status: '', 
    clientId: '',
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [conversionAlertData, setConversionAlertData] = useState<Quote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setFilters(prev => ({ ...prev, status: statusFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeAccountId) return;
    setIsLoading(true);
    
    const q = query(collection(db, 'quotes'), where('userId', '==', activeAccountId), orderBy('createdAt', 'desc'));
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

    const clientsQuery = query(collection(db, 'customers'), where('userId', '==', activeAccountId), orderBy('name'));
    const unsubClients = onSnapshot(clientsQuery, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    return () => {
        unsubscribe();
        unsubClients();
    };
  }, [activeAccountId, toast]);
  
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
    if (!conversionAlertData || !user || !user.email || !activeAccountId) return;

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
          userId: activeAccountId,
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
        const clientMatch = filters.clientId ? quote.clientId === filters.clientId : true;
        return statusMatch && clientMatch;
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
  
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  
  const isAnyFilterActive = Object.values(filters).some(value => value !== '' && value !== undefined);

  return (
    <>
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Orçamentos</h1>
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
                   <SearchableSelect
                        value={filters.clientId}
                        onValueChange={(value) => handleFilterChange('clientId', value)}
                        options={clients.map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Selecione um cliente..."
                    />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status-filter">Filtrar por Status</Label>
                  <SearchableSelect
                        value={filters.status}
                        onValueChange={(value) => handleFilterChange('status', value)}
                        options={[
                            { value: 'Pendente', label: 'Pendente' },
                            { value: 'Aprovado', label: 'Aprovado' },
                            { value: 'Recusado', label: 'Recusado' },
                            { value: 'Convertido', label: 'Convertido' },
                        ]}
                        placeholder="Selecione um status..."
                    />
                </div>
            </CardContent>
          </Card>
          
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
                      <TableHead className="text-right">Ações</TableHead>
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
                          <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewQuote(quote)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Visualizar</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/dashboard/orcamentos/${quote.id}`)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Gerenciar</p></TooltipContent>
                                </Tooltip>
                                {quote.status === 'Aprovado' && (
                                     <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConversionAlertData(quote)} disabled={isConverting === quote.id}>
                                                {isConverting === quote.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Converter em OS</p></TooltipContent>
                                    </Tooltip>
                                )}
                          </div>
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
                          <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent>
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

      <Dialog open={!!previewQuote} onOpenChange={(isOpen) => !isOpen && setPreviewQuote(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4">
            <DialogHeader>
                <DialogTitle>Visualização do Orçamento</DialogTitle>
                <DialogDescription>
                  Prévia de como o orçamento será impresso.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow rounded-lg border overflow-hidden bg-muted/20">
              {previewQuote && <iframe src={`/print/orcamento/${previewQuote.id}?preview=true`} className="w-full h-full" title="Pré-visualização do Orçamento" />}
            </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
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
