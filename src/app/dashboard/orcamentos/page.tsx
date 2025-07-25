

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp, orderBy, doc, updateDoc, runTransaction, addDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { format } from 'date-fns';
import { Quote, ServiceOrder, Client, Collaborator } from '@/types';
import { cn } from '@/lib/utils';
import { addDays, startOfDay, isAfter, isBefore } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, FileText, Filter, Eye, Copy, Trash2, LayoutTemplate, X, CalendarIcon, CheckCircle2, Thermometer, ChevronLeft, ChevronRight, Paperclip, FileSignature, Wrench, Pencil, ChevronsUpDown, Check, BookOpen } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateQuoteModal } from '@/components/create-quote-modal';
import { bulkConvertQuotesToServiceOrders, bulkDeleteQuotes, bulkUpdateQuoteStatus } from './actions';
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


function OrcamentosPageComponent() {
  const { user, activeAccountId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filters, setFilters] = useState({ 
    status: '', 
    clientId: '',
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isBulkConvertAlertOpen, setIsBulkConvertAlertOpen] = useState(false);
  
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
    });

    const clientsQuery = query(collection(db, 'customers'), where('userId', '==', activeAccountId), orderBy('name'));
    const unsubClients = onSnapshot(clientsQuery, snapshot => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    return () => {
        unsubscribe();
        unsubClients();
    };
  }, [activeAccountId]);
  
  const handleBulkUpdateStatus = async (newStatus: Quote['status']) => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) return;
    setIsUpdating(true);
    const result = await bulkUpdateQuoteStatus(selectedIds, newStatus);
    if(result.success) {
      toast({ title: 'Sucesso!', description: `${result.updatedCount} orçamento(s) atualizado(s).` });
      setSelectedRows({});
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    setIsUpdating(false);
  };
  
  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) return;
    setIsUpdating(true);
    const result = await bulkDeleteQuotes(selectedIds);
    if(result.success) {
      toast({ title: 'Sucesso!', description: `${result.deletedCount} orçamento(s) excluído(s).` });
      setSelectedRows({});
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    setIsBulkDeleteAlertOpen(false);
    setIsUpdating(false);
  };
  
  const handleBulkConvert = async () => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) return;
    
    const approvedIds = selectedIds.filter(id => {
      const quote = quotes.find(q => q.id === id);
      return quote && quote.status === 'Aprovado';
    });

    if (approvedIds.length === 0) {
      toast({ variant: 'destructive', title: 'Ação Inválida', description: 'Nenhum orçamento aprovado foi selecionado para conversão.' });
      setIsBulkConvertAlertOpen(false);
      return;
    }

    setIsUpdating(true);
    const result = await bulkConvertQuotesToServiceOrders(approvedIds);
    if(result.success) {
      toast({ title: 'Sucesso!', description: `${result.convertedCount} orçamento(s) convertido(s) em OS.` });
      setSelectedRows({});
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    setIsBulkConvertAlertOpen(false);
    setIsUpdating(false);
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
  
  const numSelected = Object.keys(selectedRows).filter(id => selectedRows[id]).length;

  const handleSelectAll = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) {
      paginatedQuotes.forEach(order => newSelectedRows[order.id] = true);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleRowSelect = (rowId: string, checked: boolean) => {
    setSelectedRows(prev => ({ ...prev, [rowId]: checked }));
  };

  const selectedQuotes = latestQuotes.filter(q => selectedRows[q.id]);
  const canBulkConvert = selectedQuotes.some(q => q.status === 'Aprovado');

  return (
    <>
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <Card>
            <CardHeader>
              <CardTitle><span className="flex items-center gap-2"><Filter className="h-5 w-5"/>Filtros de Orçamentos</span></CardTitle>
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
          {numSelected > 0 && (
            <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <div className="text-sm font-medium">{numSelected} orçamento(s) selecionado(s)</div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Alterar Status</Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleBulkUpdateStatus('Pendente')}>Pendente</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkUpdateStatus('Aprovado')}>Aprovado</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleBulkUpdateStatus('Recusado')}>Recusado</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => setIsBulkConvertAlertOpen(true)} disabled={!canBulkConvert}>Converter para OS</Button>
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}>Excluir Selecionados</Button>
              </div>
            </div>
          )}
            {isLoading ? (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) : 
             paginatedQuotes.length === 0 ? (<div className="text-center py-10"><FileText className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Nenhum orçamento encontrado.</h3></div>) :
            (<div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"><Checkbox onCheckedChange={handleSelectAll} checked={numSelected > 0 && numSelected === paginatedQuotes.length} indeterminate={numSelected > 0 && numSelected < paginatedQuotes.length}/></TableHead>
                      <TableHead>Orçamento (Versão)</TableHead>
                      <TableHead>Título / Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Valor Total</TableHead>
                      <TableHead className="hidden lg:table-cell">Criação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead><span className="sr-only">Ações</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedQuotes.map((quote) => (
                      <TableRow key={quote.id} data-state={selectedRows[quote.id] && "selected"}>
                         <TableCell><Checkbox checked={!!selectedRows[quote.id]} onCheckedChange={(checked) => handleRowSelect(quote.id, !!checked)} /></TableCell>
                         <TableCell><Link href={`/dashboard/orcamentos/${quote.id}`} className="font-mono text-sm font-medium hover:underline">#{quote.id.substring(0, 6).toUpperCase()} (v{quote.version || 1})</Link></TableCell>
                         <TableCell><Link href={`/dashboard/orcamentos/${quote.id}`} className="font-medium hover:underline" title={quote.title}>{quote.title}</Link><div className="text-sm text-muted-foreground"><Link href={`/dashboard/base-de-clientes/${quote.clientId}`} className="hover:underline" title="Ver detalhes do cliente">{quote.clientName}</Link></div></TableCell>
                         <TableCell className="hidden md:table-cell">{formatCurrency(quote.totalValue)}</TableCell>
                         <TableCell className="hidden lg:table-cell">{quote.createdAt ? format(quote.createdAt.toDate(), 'dd/MM/yyyy') : ''}</TableCell>
                         <TableCell><Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge></TableCell>
                         <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onSelect={() => router.push(`/dashboard/orcamentos/${quote.id}`)}><BookOpen className="mr-2 h-4 w-4" />Abrir</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setPreviewQuote(quote)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setIsEditModalOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => router.push(`/dashboard/orcamentos/criar?versionOf=${quote.id}`)}><Copy className="mr-2 h-4 w-4" />Criar Nova Versão</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                <div className="flex-1">{numSelected} de {paginatedQuotes.length} linha(s) selecionada(s).</div>
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

       <AlertDialog open={isBulkConvertAlertOpen} onOpenChange={setIsBulkConvertAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Conversão em Massa</AlertDialogTitle><AlertDialogDescription>Você está prestes a converter os orçamentos APROVADOS selecionados em Ordens de Serviço. Orçamentos com outros status serão ignorados. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkConvert} disabled={isUpdating}>Sim, Converter</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita e excluirá permanentemente todos os orçamentos selecionados.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">Sim, Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewQuote} onOpenChange={(isOpen) => !isOpen && setPreviewQuote(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-4">
            <DialogHeader><DialogTitle>Visualização do Orçamento</DialogTitle><DialogDescription>Prévia de como o orçamento será impresso.</DialogDescription></DialogHeader>
            <div className="flex-grow rounded-lg border overflow-hidden bg-muted/20">{previewQuote && <iframe src={`/print/orcamento/${previewQuote.id}?preview=true`} className="w-full h-full" title="Pré-visualização do Orçamento" />}</div>
        </DialogContent>
      </Dialog>
      
      <CreateQuoteModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} baseQuoteId={editingQuoteId}/>
    </TooltipProvider>
    </>
  );
}

export default function OrcamentosPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <OrcamentosPageComponent />
        </Suspense>
    );
}

```
  <change>
    <file>src/app/dashboard/inventario/page.tsx</file>
    <content><![CDATA[

import { InventoryClient } from "./inventory-client";

// This is now a Server Component by default
export default function InventarioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Gestão de Inventário</h1>
      </div>
      <InventoryClient />
    </div>
  );
}
