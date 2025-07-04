
'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Users, Loader2, ListTodo, History, FilePlus, UserPlus, FileText, Package, Search } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { RecentActivity, ServiceOrder, Quote, Customer } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'Cliente' | 'Serviço' | 'Inventário' | 'Orçamento';
  title: string;
  description: string;
  href: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Page data state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeOrders: 0, totalCustomers: 0 });
  const [upcomingOrders, setUpcomingOrders] = useState<ServiceOrder[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);


  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    
    setLoading(true);

    const activeStatuses = ['Pendente', 'Em Andamento', 'Aguardando Peça'];
    
    const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ServiceOrder);
      const activeCount = allOrders.filter(doc => activeStatuses.includes(doc.status)).length;
      const upcoming = allOrders
        .filter(o => activeStatuses.includes(o.status) && o.dueDate)
        .sort((a, b) => a.dueDate.seconds - b.dueDate.seconds)
        .slice(0, 5);
      
      setStats(prevStats => ({...prevStats, activeOrders: activeCount}));
      setUpcomingOrders(upcoming);
    });

    const customersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
    const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
        const customerCount = snapshot.size;
        setStats(prevStats => ({...prevStats, totalCustomers: customerCount}));
    });
    
    const fetchRecentActivities = async () => {
        try {
            const recentOrdersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3));
            const recentCustomersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3));
            const recentQuotesQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3));
            
            const [ordersSnap, customersSnap, quotesSnap] = await Promise.all([
                getDocs(recentOrdersQuery),
                getDocs(recentCustomersQuery),
                getDocs(recentQuotesQuery),
            ]);
            
            const ordersActivity: RecentActivity[] = ordersSnap.docs.map(doc => {
                const data = doc.data() as ServiceOrder;
                return {
                    id: doc.id,
                    type: 'serviço' as const,
                    description: `Nova OS: ${data.serviceType} para ${data.clientName}`,
                    timestamp: data.createdAt.toDate(),
                    href: `/dashboard/servicos/${doc.id}`
                }
            });
            
            const customersActivity: RecentActivity[] = customersSnap.docs.map(doc => {
                const data = doc.data() as Customer;
                return {
                    id: doc.id,
                    type: 'cliente' as const,
                    description: `Novo cliente: ${data.name}`,
                    timestamp: data.createdAt.toDate(),
                    href: `/dashboard/base-de-clientes/${doc.id}`
                }
            });

            const quotesActivity: RecentActivity[] = quotesSnap.docs.map(doc => {
                const data = doc.data() as Quote;
                return {
                    id: doc.id,
                    type: 'orçamento' as const,
                    description: `Orçamento para ${data.clientName}`,
                    timestamp: data.createdAt.toDate(),
                    href: `/dashboard/orcamentos/${doc.id}`
                }
            });
            
            const combined = [...ordersActivity, ...customersActivity, ...quotesActivity]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 5);
                
            setRecentActivity(combined);

        } catch (error) {
            console.error("Error fetching recent activities: ", error);
        }
    };

    fetchRecentActivities().finally(() => {
        setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
    };

  }, [user]);

  const performSearch = useCallback(async (term: string) => {
    if (!user || term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const customerQuery = query(collection(db, 'customers'), where('userId', '==', user.uid), where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(5));
      const orderQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('serviceType', '>=', term), where('serviceType', '<=', term + '\uf8ff'), limit(5));
      const inventoryQuery = query(collection(db, 'inventory'), where('userId', '==', user.uid), where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(5));
      const quoteQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid), where('clientName', '>=', term), where('clientName', '<=', term + '\uf8ff'), limit(5));

      const [customersSnap, ordersSnap, inventorySnap, quotesSnap] = await Promise.all([
        getDocs(customerQuery), getDocs(orderQuery), getDocs(inventoryQuery), getDocs(quoteQuery)
      ]);

      const customerResults: SearchResult[] = customersSnap.docs.map(doc => ({ id: doc.id, type: 'Cliente', title: doc.data().name, description: doc.data().phone, href: `/dashboard/base-de-clientes/${doc.id}` }));
      const orderResults: SearchResult[] = ordersSnap.docs.map(doc => ({ id: doc.id, type: 'Serviço', title: doc.data().serviceType, description: `Cliente: ${doc.data().clientName}`, href: `/dashboard/servicos/${doc.id}` }));
      const inventoryResults: SearchResult[] = inventorySnap.docs.map(doc => ({ id: doc.id, type: 'Inventário', title: doc.data().name, description: `Qtd: ${doc.data().quantity}`, href: `/dashboard/inventario` }));
      const quoteResults: SearchResult[] = quotesSnap.docs.map(doc => ({ id: doc.id, type: 'Orçamento', title: `Orçamento para ${doc.data().clientName}`, description: `ID: ...${doc.id.slice(-4)}`, href: `/dashboard/orcamentos/${doc.id}` }));
      
      setSearchResults([...customerResults, ...orderResults, ...inventoryResults, ...quoteResults]);
    } catch (error) {
      console.error("Error performing global search:", error);
    } finally {
      setSearchLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, performSearch]);

  const handleSelect = (href: string) => {
    router.push(href);
    setIsPopoverOpen(false);
    setSearchTerm('');
  }

  const getSearchIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'Cliente': return <Users className="h-4 w-4" />;
      case 'Serviço': return <Wrench className="h-4 w-4" />;
      case 'Inventário': return <Package className="h-4 w-4" />;
      case 'Orçamento': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };


  const getRecentActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'cliente': return <Users className="h-4 w-4 text-muted-foreground"/>;
      case 'serviço': return <Wrench className="h-4 w-4 text-muted-foreground"/>;
      case 'orçamento': return <FileText className="h-4 w-4 text-muted-foreground"/>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search /> Busca Rápida</CardTitle>
            <CardDescription>Encontre clientes, serviços, orçamentos e itens de inventário instantaneamente.</CardDescription>
        </CardHeader>
        <CardContent>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Buscar em todo o sistema..."
                            className="w-full pl-10"
                            value={searchTerm}
                            onChange={(e) => {
                                const term = e.target.value;
                                setSearchTerm(term);
                                if (term.length > 1) {
                                    setIsPopoverOpen(true);
                                } else {
                                    setIsPopoverOpen(false);
                                }
                            }}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                        <CommandList>
                            {searchLoading && <CommandEmpty>Buscando...</CommandEmpty>}
                            {!searchLoading && searchResults.length === 0 && searchTerm.length > 1 && <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>}
                            
                            {searchResults.length > 0 && (
                                <CommandGroup heading="Resultados">
                                    {searchResults.map((result) => (
                                        <CommandItem key={result.id} onSelect={() => handleSelect(result.href)} value={result.title}>
                                            {getSearchIcon(result.type)}
                                            <span className="ml-2 font-medium">{result.title}</span>
                                            <span className="ml-2 text-xs text-muted-foreground truncate">{result.description}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListTodo /> Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/dashboard/servicos/criar" passHref>
                    <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                        <Wrench className="h-6 w-6 text-primary" />
                        <span>Nova Ordem de Serviço</span>
                    </Button>
                </Link>
                <Link href="/dashboard/orcamentos/criar" passHref>
                    <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                        <FilePlus className="h-6 w-6 text-primary" />
                        <span>Criar Orçamento</span>
                    </Button>
                </Link>
                 <Link href="/dashboard/base-de-clientes" passHref>
                    <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                        <UserPlus className="h-6 w-6 text-primary" />
                        <span>Novo Cliente</span>
                    </Button>
                </Link>
            </CardContent>
        </Card>
         <div className="grid gap-6">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ordens de Serviço Ativas</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.activeOrders}</div>}
                <p className="text-xs text-muted-foreground">Ordens pendentes ou em andamento.</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.totalCustomers}</div>}
                <p className="text-xs text-muted-foreground">Total de clientes em sua base.</p>
            </CardContent>
            </Card>
         </div>
      </div>
       <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListTodo/> Próximos Prazos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                upcomingOrders.length > 0 ? (
                    <ul className="space-y-3">
                        {upcomingOrders.map(order => (
                            <li key={order.id} className="flex items-center justify-between">
                                <Link href={`/dashboard/servicos/${order.id}`} className="hover:underline">
                                    <p className="font-medium">{order.clientName}</p>
                                    <p className="text-sm text-muted-foreground">{new Date(order.dueDate.seconds * 1000).toLocaleDateString()}</p>
                                </Link>
                                <Badge variant="secondary">{order.status}</Badge>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-center text-muted-foreground py-4">Nenhuma ordem de serviço com prazo definido.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History/> Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                 recentActivity.length > 0 ? (
                    <ul className="space-y-4">
                        {recentActivity.map(activity => (
                             <li key={activity.id} className="flex items-start gap-3">
                                <div className="mt-1">
                                    {getRecentActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1">
                                    <Link href={activity.href} className="hover:underline">
                                        <p className="text-sm">{activity.description}</p>
                                    </Link>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
                                    </p>
                                </div>
                             </li>
                        ))}
                    </ul>
                 ) : <p className="text-sm text-center text-muted-foreground py-4">Nenhuma atividade recente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
