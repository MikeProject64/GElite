
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
import { cn } from '@/lib/utils';
import { bulkConvertQuotesToServiceOrders, bulkDeleteQuotes, bulkUpdateQuoteStatus } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, FileText, Filter, Eye, Copy, Trash2, LayoutTemplate, X, CheckCircle2, ChevronsUpDown, Check, BookOpen } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateQuoteModal } from '@/components/create-quote-modal';
import { Checkbox } from '@/components/ui/checkbox';


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
  const { user, activeAccountId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);
  
  const [filters, setFilters] = useState({ 
    status: searchParams.get('status') || '',
    clientId: '',
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  
  const [conversionAlertData, setConversionAlertData] = useState<Quote | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);


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
  
  const handleBulkAction = async (action: 'change_status' | 'convert' | 'delete', value?: any) => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum item selecionado' });
      return;
    }
    
    setIsBulkActionLoading(true);
    let result: { success: boolean; message?: string; };

    switch(action) {
      case 'change_status':
        result = await bulkUpdateQuoteStatus(selectedIds, value);
        break;
      case 'convert':
        result = await bulkConvertQuotesToServiceOrders(selectedIds);
        break;
      case 'delete':
        result = await bulkDeleteQuotes(selectedIds);
        break;
      default:
        result = { success: false, message: 'Ação desconhecida.' };
    }

    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
      setSelectedRows({}); // Limpa a seleção
    } else {
      toast({ variant: 'destructive', title: 'Erro na Ação em Massa', description: result.message });
    }
    setIsBulkActionLoading(false);
  };
  
  const handleEditQuote = (quoteId: string) => {
    setEditingQuoteId(quoteId);
    setIsEditModalOpen(true);
  };

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
    setSelectedRows({});
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
  const numSelected = Object.keys(selectedRows).filter(id => selectedRows[id]).length;

  return (
    <>
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold md:text-2xl">Orçamentos</h1>
        </div>
          
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Propostas e Orçamentos</CardTitle>
            <CardDescription>Crie, envie e acompanhe o status de seus orçamentos.</CardDescription>
          </CardHeader>
          <CardContent>
             {numSelected > 0 && (
                <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <div className="text-sm font-medium">{numSelected} selecionado(s)</div>
                    <div className="flex items-center gap-2">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isBulkActionLoading}>Alterar Status</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Selecione o novo status</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleBulkAction('change_status', 'Pendente')}>Pendente</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleBulkAction('change_status', 'Aprovado')}>Aprovado</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleBulkAction('change_status', 'Recusado')}>Recusado</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" onClick={() => handleBulkAction('convert')} disabled={isBulkActionLoading}>Converter em OS</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleBulkAction('delete')} disabled={isBulkActionLoading}>Excluir</Button>
                    </div>
                </div>
            )}
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
                      <TableHead className="w-12"><Checkbox 
                        onCheckedChange={(checked) => {
                            const newSelection: Record<string, boolean> = {};
                            if (checked) {
                                paginatedQuotes.forEach(q => newSelection[q.id] = true);
                            }
                            setSelectedRows(newSelection);
                        }}
                        checked={numSelected > 0 && numSelected === paginatedQuotes.length}
                        indeterminate={numSelected > 0 && numSelected < paginatedQuotes.length}
                      /></TableHead>
                      <TableHead>Orçamento (Versão)</TableHead>
                      <TableHead>Título / Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Valor Total</TableHead>
                      <TableHead className="hidden lg:table-cell">Criação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedQuotes.map((quote) => (
                      <TableRow key={quote.id} data-state={selectedRows[quote.id] && "selected"}>
                        <TableCell><Checkbox 
                            checked={!!selectedRows[quote.id]}
                            onCheckedChange={checked => setSelectedRows(prev => ({ ...prev, [quote.id]: !!checked }))}
                        /></TableCell>
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
                                  {quote.clientName} ({clients.find(c => c.id === quote.clientId)?.phone})
                              </Link>
                          </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatCurrency(quote.totalValue)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{quote.createdAt ? format(quote.createdAt.toDate(), 'dd/MM/yyyy') : ''}</TableCell>
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/dashboard/orcamentos/${quote.id}`)}>
                                            <BookOpen className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Abrir</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewQuote(quote)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Visualizar</p></TooltipContent>
                                </Tooltip>
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
                  <div className="flex-1">
                    {numSelected > 0 ? `${numSelected} de ${filteredQuotes.length} selecionado(s)` : `Total de ${filteredQuotes.length} orçamentos`}
                  </div>
                  <div className="flex items-center gap-2"><span>Linhas por página:</span><Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}><SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem></SelectContent></Select></div>
                  <div className='flex-1 text-center'>Página {currentPage} de {totalPages}</div>
                  <div className="flex flex-1 justify-end items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading}><ChevronLeft className="h-4 w-4" />Anterior</Button>
                      <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage >= totalPages || isLoading}>Próximo<ChevronRight className="h-4 w-4" /></Button>
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
              Isso criará uma nova Ordem de Serviço com base neste orçamento. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {}}>Sim, Converter</AlertDialogAction>
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
      
      <CreateQuoteModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        baseQuoteId={editingQuoteId}
      />
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
                  onSelect={() => {
                    onValueChange(option.value === value ? '' : option.value);
                    setOpen(false);
                  }}
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
