
'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Users, Loader2, ListTodo, History, FileText, Package, Search } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { RecentActivity, ServiceOrder, Quote, Customer } from '@/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { OrderStatusChart } from '@/components/dashboard/order-status-chart';
import { MonthlyRevenueChart } from '@/components/dashboard/monthly-revenue-chart';

interface SearchResult {
  id: string;
  type: 'Cliente' | 'Serviço' | 'Inventário' | 'Orçamento';
  title: string;
  description: string;
  href: string;
}

interface ChartData {
  orderStatus: { status: string; count: number; fill: string; }[];
  monthlyRevenue: { month: string; total: number; }[];
}

const STATUS_COLORS: { [key: string]: string } = {
  'Pendente': 'hsl(var(--chart-1))',
  'Em Andamento': 'hsl(var(--chart-2))',
  'Aguardando Peça': 'hsl(var(--chart-3))',
  'Concluída': 'hsl(var(--chart-4))',
  'Cancelada': 'hsl(var(--chart-5))',
};
const getStatusColor = (status: string) => STATUS_COLORS[status] || 'hsl(var(--muted))';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Page data state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeOrders: 0, totalCustomers: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ orderStatus: [], monthlyRevenue: [] });
  
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
    
    let isMounted = true;
    setLoading(true);

    const activeStatuses = ['Pendente', 'Em Andamento', 'Aguardando Peça'];
    
    // Combined data fetching function
    const fetchDashboardData = async () => {
        try {
            // --- Fetch for Stats and Charts ---
            const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));
            const customersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
            const quotesQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid));

            const [ordersSnap, customersSnap, quotesSnap] = await Promise.all([
                getDocs(ordersQuery),
                getDocs(customersQuery),
                getDocs(quotesQuery),
            ]);

            if (!isMounted) return;

            // Process stats
            const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ServiceOrder);
            const activeCount = allOrders.filter(doc => activeStatuses.includes(doc.status)).length;
            const customerCount = customersSnap.size;
            setStats({ activeOrders: activeCount, totalCustomers: customerCount });

            // Process chart data
            // 1. Order Status Pie Chart
            const statusCounts = allOrders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            const orderStatus = Object.entries(statusCounts).map(([status, count]) => ({
                status,
                count,
                fill: getStatusColor(status),
            }));

            // 2. Monthly Revenue Bar Chart
            const completedOrders = allOrders.filter(o => o.status === 'Concluída' && o.completedAt);

            const sixMonthsAgo = subMonths(new Date(), 5);
            const monthlyRevenueMap = completedOrders.reduce((acc, order) => {
                const completionDate = order.completedAt!.toDate();
                if (completionDate >= startOfMonth(sixMonthsAgo)) {
                    const monthKey = format(completionDate, 'yyyy-MM');
                    acc[monthKey] = (acc[monthKey] || 0) + order.totalValue;
                }
                return acc;
            }, {} as Record<string, number>);

            const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
                const date = subMonths(new Date(), 5 - i);
                const monthKey = format(date, 'yyyy-MM');
                const monthName = format(date, 'MMM/yy', { locale: ptBR });
                return { month: monthName, total: monthlyRevenueMap[monthKey] || 0 };
            });

            setChartData({ orderStatus, monthlyRevenue });

            // --- Fetch for Recent Activity ---
            const recentOrders = allOrders.sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).slice(0,3);
            const recentCustomers = customersSnap.docs.map(doc => ({id: doc.id, ...doc.data()}) as Customer).sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).slice(0,3);
            const recentQuotes = quotesSnap.docs.map(doc => ({id: doc.id, ...doc.data()}) as Quote).sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).slice(0,3);
            
            const ordersActivity: RecentActivity[] = recentOrders.map(data => ({ id: data.id, type: 'serviço', description: `Nova OS: ${data.serviceType} para ${data.clientName}`, timestamp: data.createdAt.toDate(), href: `/dashboard/servicos/${data.id}`}));
            const customersActivity: RecentActivity[] = recentCustomers.map(data => ({ id: data.id, type: 'cliente', description: `Novo cliente: ${data.name}`, timestamp: data.createdAt.toDate(), href: `/dashboard/base-de-clientes/${data.id}`}));
            const quotesActivity: RecentActivity[] = recentQuotes.map(data => ({ id: data.id, type: 'orçamento', description: `Orçamento para ${data.clientName}`, timestamp: data.createdAt.toDate(), href: `/dashboard/orcamentos/${data.id}`}));
            
            const combined = [...ordersActivity, ...customersActivity, ...quotesActivity]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 5);
                
            setRecentActivity(combined);

        } catch (error) {
            console.error("Error fetching dashboard data: ", error);
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };
    
    fetchDashboardData();

    return () => {
      isMounted = false;
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
      {/* Search Bar */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Search /> Busca Rápida</CardTitle>
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
      
      {/* Main Grid: Stats and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 flex flex-col gap-6">
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
        <div className="lg:col-span-2">
            <Card className='h-full'>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><History/> Atividade Recente</CardTitle>
                    <CardDescription>Últimas movimentações no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <div className='flex justify-center items-center h-full'><Loader2 className="h-6 w-6 animate-spin" /></div> : (
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
      
       {/* Charts Grid */}
       <div className="grid gap-6 md:grid-cols-2">
        {loading ? (
          <>
            <Card><CardContent className="p-6 flex justify-center items-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
            <Card><CardContent className="p-6 flex justify-center items-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
          </>
        ) : (
          <>
            <OrderStatusChart data={chartData.orderStatus} />
            <MonthlyRevenueChart data={chartData.monthlyRevenue} />
          </>
        )}
      </div>
    </div>
  );
}
