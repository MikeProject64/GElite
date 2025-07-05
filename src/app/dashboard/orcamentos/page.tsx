
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, query, where, onSnapshot, Timestamp, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import { Quote } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, PlusCircle, FileText, Filter, Eye, Copy, Trash2, LayoutTemplate } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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


export default function OrcamentosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', clientName: '' });

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
        return statusMatch && clientMatch;
    });
  }, [latestQuotes, filters]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const totalQuotesCount = useMemo(() => {
    return latestQuotes.length;
  }, [latestQuotes]);

  return (
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
          <CardContent className="grid sm:grid-cols-2 gap-4">
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
          ) : quotes.length === 0 ? (
            <div className="text-center py-10">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum orçamento encontrado.</h3>
                <p className="text-sm text-muted-foreground">Que tal criar o primeiro?</p>
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
                {filteredQuotes.map((quote) => (
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
                        <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/orcamentos/${quote.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> Ver / Gerenciar
                            </DropdownMenuItem>
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
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>{filteredQuotes.length}</strong> de <strong>{totalQuotesCount}</strong> orçamentos.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
