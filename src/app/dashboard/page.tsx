
'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Users, Loader2, ListTodo, History, FileText, Package, Search, Briefcase } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { RecentActivity, ServiceOrder, Quote, Customer, Collaborator } from '@/types';
import Link from 'next/link';
import { formatDistanceToNow, format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { OrderStatusChart } from '@/components/dashboard/order-status-chart';
import { MonthlyRevenueChart } from '@/components/dashboard/monthly-revenue-chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  type: 'Cliente' | 'Serviço' | 'Orçamento' | 'Colaborador';
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

const getStatusColor = (status: string) => {
    if (STATUS_COLORS[status]) {
        return STATUS_COLORS[status];
    }
    // Simple hash function to get a color for custom statuses
    let hash = 0;
    for (let i = 0; i < status.length; i++) {
        hash = status.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % 5; // Use one of the 5 chart colors
    return `hsl(var(--chart-${colorIndex + 1}))`;
};


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
  const popoverRef = useRef<HTMLDivElement>(null);


  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
        const activeStatuses = ['Pendente', 'Em Andamento', 'Aguardando Peça'];
        
        // --- Fetch for Stats and Charts ---
        const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));
        const customersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
        const quotesQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid));

        const [ordersSnap, customersSnap, quotesSnap] = await Promise.all([
            getDocs(ordersQuery),
            getDocs(customersQuery),
            getDocs(quotesQuery),
        ]);

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
        setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const performSearch = useCallback(async (term: string) => {
    if (!user || term.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const lowerTerm = term.toLowerCase();
      
      const customerQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
      const orderQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));
      const quoteQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid));
      const collaboratorQuery = query(collection(db, 'collaborators'), where('userId', '==', user.uid));

      const [customersSnap, ordersSnap, quotesSnap, collaboratorsSnap] = await Promise.all([
        getDocs(customerQuery), getDocs(orderQuery), getDocs(quoteQuery), getDocs(collaboratorQuery)
      ]);
      
      const customerResults: SearchResult[] = customersSnap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Customer))
        .filter(c => c.name.toLowerCase().includes(lowerTerm) || c.phone.includes(lowerTerm))
        .map(doc => ({ id: doc.id, type: 'Cliente', title: doc.name, description: doc.phone, href: `/dashboard/base-de-clientes/${doc.id}` }))
        .slice(0, 5);

      const orderResults: SearchResult[] = ordersSnap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as ServiceOrder))
        .filter(o => o.serviceType.toLowerCase().includes(lowerTerm) || o.clientName.toLowerCase().includes(lowerTerm))
        .map(doc => ({ id: doc.id, type: 'Serviço', title: doc.serviceType, description: `Cliente: ${doc.clientName}`, href: `/dashboard/servicos/${doc.id}` }))
        .slice(0, 5);
      
      const quoteResults: SearchResult[] = quotesSnap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Quote))
        .filter(q => q.clientName.toLowerCase().includes(lowerTerm) || q.id.includes(lowerTerm))
        .map(doc => ({ id: doc.id, type: 'Orçamento', title: `Orçamento para ${doc.clientName}`, description: `ID: ...${doc.id.slice(-4)}`, href: `/dashboard/orcamentos/${doc.id}` }))
        .slice(0, 5);
      
      const collaboratorResults: SearchResult[] = collaboratorsSnap.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as Collaborator))
        .filter(m => m.name.toLowerCase().includes(lowerTerm))
        .map(doc => ({ id: doc.id, type: 'Colaborador', title: doc.name, description: 'Colaborador / Setor', href: `/dashboard/colaboradores/${doc.id}` }))
        .slice(0, 5);
      
      setSearchResults([...customerResults, ...orderResults, ...quoteResults, ...collaboratorResults]);
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
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverRef]);


  const getSearchIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'Cliente': return <Users className="h-4 w-4 text-muted-foreground" />;
      case 'Serviço': return <Wrench className="h-4 w-4 text-muted-foreground" />;
      case 'Orçamento': return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'Colaborador': return <Briefcase className="h-4 w-4 text-muted-foreground" />;
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
       {/* Main Grid: Stats and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><Search /> Busca Rápida</CardTitle>
                    <CardDescription>Encontre clientes, serviços, orçamentos e colaboradores instantaneamente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild className='w-full'>
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
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" ref={popoverRef}>
                           <div className="p-2 border-b">
                             <Input
                                placeholder="Buscar em todo o sistema..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                                className="pl-8"
                              />
                              <Search className="absolute left-5 top-4.5 h-4 w-4 text-muted-foreground" />
                           </div>
                           <ScrollArea className="h-60">
                                {searchLoading && <p className="p-4 text-center text-sm">Buscando...</p>}
                                {!searchLoading && searchResults.length === 0 && searchTerm.length > 1 && (
                                    <p className="p-4 text-center text-sm">Nenhum resultado encontrado.</p>
                                )}
                                {searchResults.length > 0 && (
                                     searchResults.map((result) => (
                                        <Button
                                            variant="ghost"
                                            key={result.id}
                                            className="flex w-full justify-start items-center p-2 text-sm rounded-none h-auto"
                                            onClick={() => {
                                              router.push(result.href);
                                              setIsPopoverOpen(false);
                                              setSearchTerm('');
                                            }}
                                        >
                                            {getSearchIcon(result.type)}
                                            <div className='ml-2 text-left'>
                                                <p className='font-medium'>{result.title}</p>
                                                <p className="text-xs text-muted-foreground">{result.description}</p>
                                            </div>
                                        </Button>
                                    ))
                                )}
                           </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>
        </div>

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

       <div className="grid gap-6">
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
  );
}
