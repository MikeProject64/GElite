
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-provider';
import { cn } from '@/lib/utils';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from './ui/button';
import { FileText, Package, Search, Users, Wrench } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'Cliente' | 'Serviço' | 'Inventário' | 'Orçamento';
  title: string;
  description: string;
  href: string;
}

export function GlobalSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const performSearch = useCallback(async (term: string) => {
    if (!user || term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);

    try {
      const customerQuery = query(collection(db, 'customers'), where('userId', '==', user.uid), where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(5));
      const orderQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('serviceType', '>=', term), where('serviceType', '<=', term + '\uf8ff'), limit(5));
      const inventoryQuery = query(collection(db, 'inventory'), where('userId', '==', user.uid), where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(5));
      const quoteQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid), where('clientName', '>=', term), where('clientName', '<=', term + '\uf8ff'), limit(5));

      const [customersSnap, ordersSnap, inventorySnap, quotesSnap] = await Promise.all([
        getDocs(customerQuery),
        getDocs(orderQuery),
        getDocs(inventoryQuery),
        getDocs(quoteQuery)
      ]);

      const customerResults: SearchResult[] = customersSnap.docs.map(doc => ({ id: doc.id, type: 'Cliente', title: doc.data().name, description: doc.data().phone, href: `/dashboard/base-de-clientes/${doc.id}` }));
      const orderResults: SearchResult[] = ordersSnap.docs.map(doc => ({ id: doc.id, type: 'Serviço', title: doc.data().serviceType, description: `Cliente: ${doc.data().clientName}`, href: `/dashboard/servicos/${doc.id}` }));
      const inventoryResults: SearchResult[] = inventorySnap.docs.map(doc => ({ id: doc.id, type: 'Inventário', title: doc.data().name, description: `Qtd: ${doc.data().quantity}`, href: `/dashboard/inventario` }));
      const quoteResults: SearchResult[] = quotesSnap.docs.map(doc => ({ id: doc.id, type: 'Orçamento', title: `Orçamento para ${doc.data().clientName}`, description: doc.data().description, href: `/dashboard/orcamentos/${doc.id}` }));
      
      setResults([...customerResults, ...orderResults, ...inventoryResults, ...quoteResults]);
    } catch (error) {
      console.error("Error performing global search:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, performSearch]);

  const runCommand = useCallback((command: () => void) => {
    setIsOpen(false);
    command();
  }, []);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'Cliente': return <Users className="h-4 w-4" />;
      case 'Serviço': return <Wrench className="h-4 w-4" />;
      case 'Inventário': return <Package className="h-4 w-4" />;
      case 'Orçamento': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-full"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput 
            placeholder="Buscar por clientes, serviços, inventário..."
            value={searchTerm}
            onValueChange={setSearchTerm}
        />
        <CommandList>
          <CommandEmpty className={loading ? "p-4 text-center" : "hidden"}>
            Buscando...
          </CommandEmpty>
          <CommandEmpty className={!loading && searchTerm.length > 1 && results.length === 0 ? "p-4 text-center" : "hidden"}>
            Nenhum resultado encontrado.
          </CommandEmpty>

          {results.length > 0 && (
             <CommandGroup heading="Resultados da Busca">
                {results.map((result) => (
                    <CommandItem
                        key={result.id}
                        onSelect={() => runCommand(() => router.push(result.href))}
                    >
                        {getIcon(result.type)}
                        <span className="ml-2">{result.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground truncate">{result.description}</span>
                    </CommandItem>
                ))}
             </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
