
'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wrench, Users, Loader2, History, FileText, Search, Briefcase, Activity, PlusCircle, FilePlus, UserPlus, Hourglass, AlertTriangle, CalendarClock, Layout } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { RecentActivity, ServiceOrder, Quote, Customer, Collaborator } from '@/types';
import Link from 'next/link';
import { formatDistanceToNow, format, subMonths, startOfMonth, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { OrderStatusChart } from '@/components/dashboard/order-status-chart';
import { MonthlyRevenueChart } from '@/components/dashboard/monthly-revenue-chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/settings-provider';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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

interface DashboardStats {
    activeOrders: number;
    totalCustomers: number;
    overdueOrders: number;
    pendingQuotes: number;
}

const STATUS_COLORS: { [key: string]: string } = {
  'Pendente': 'hsl(var(--chart-1))',
  'Em Andamento': 'hsl(var(--chart-2))',
  'Concluída': 'hsl(var(--chart-4))',
  'Cancelada': 'hsl(var(--chart-5))',
};

const getStatusColor = (status: string) => {
    if (STATUS_COLORS[status]) {
        return STATUS_COLORS[status];
    }
    let hash = 0;
    for (let i = 0; i < status.length; i++) {
        hash = status.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % 5;
    return `hsl(var(--chart-${colorIndex + 1}))`;
};

const smallPanelIds = ['active-orders', 'pending-quotes', 'overdue-orders', 'total-customers'];
const largePanelIds = ['quick-action-buttons', 'critical-deadlines', 'recent-activity', 'order-status-chart', 'monthly-revenue-chart'];
const allPanelIds = [...smallPanelIds, ...largePanelIds];

const initialPanelVisibility = allPanelIds.reduce((acc, id) => ({ ...acc, [id]: true }), {});

const DashboardSkeleton: React.FC = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80" />)}
      </div>
    </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ activeOrders: 0, totalCustomers: 0, overdueOrders: 0, pendingQuotes: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ orderStatus: [], monthlyRevenue: [] });
  const [criticalDeadlines, setCriticalDeadlines] = useState<ServiceOrder[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const [visiblePanels, setVisiblePanels] = useState<Record<string, boolean>>(initialPanelVisibility);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedVisible = localStorage.getItem('dashboard-visible-panels');
      if (storedVisible) setVisiblePanels(JSON.parse(storedVisible));
    } catch(e) {
        console.error("Failed to load layout from localStorage", e);
    }
  }, []);

  useEffect(() => { if (isMounted) localStorage.setItem('dashboard-visible-panels', JSON.stringify(visiblePanels)); }, [visiblePanels, isMounted]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
        const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));
        const customersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
        const quotesQuery = query(collection(db, 'quotes'), where('userId', '==', user.uid));

        const [ordersSnap, customersSnap, quotesSnap] = await Promise.all([
            getDocs(ordersQuery), getDocs(customersQuery), getDocs(quotesQuery),
        ]);

        const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ServiceOrder).filter(o => o.createdAt && typeof o.createdAt.toDate === 'function');
        const allCustomers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Customer).filter(c => c.createdAt && typeof c.createdAt.toDate === 'function');
        const allQuotes = quotesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Quote).filter(q => q.createdAt && typeof q.createdAt.toDate === 'function');

        const activeStatuses = settings.serviceStatuses?.filter(s => s !== 'Concluída' && s !== 'Cancelada') || ['Pendente', 'Em Andamento'];
        const now = new Date(); now.setHours(0, 0, 0, 0);

        const activeCount = allOrders.filter(o => activeStatuses.includes(o.status)).length;
        const customerCount = allCustomers.length;
        const overdueCount = allOrders.filter(o => o.dueDate && typeof o.dueDate.toDate === 'function' && !['Concluída', 'Cancelada'].includes(o.status) && isPast(o.dueDate.toDate()) && !isToday(o.dueDate.toDate())).length;
        const pendingQuotesCount = allQuotes.filter(q => q.status === 'Pendente').length;
        setStats({ activeOrders: activeCount, totalCustomers: customerCount, overdueOrders: overdueCount, pendingQuotes: pendingQuotesCount });
        
        const activeOrdersWithDueDates = allOrders.filter(o => activeStatuses.includes(o.status) && o.dueDate && typeof o.dueDate.toDate === 'function');
        const overdue = activeOrdersWithDueDates.filter(o => isPast(o.dueDate.toDate()) && !isToday(o.dueDate.toDate())).sort((a,b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime());
        const dueToday = activeOrdersWithDueDates.filter(o => isToday(o.dueDate.toDate()));
        setCriticalDeadlines([...overdue, ...dueToday].slice(0, 5));

        const statusCounts = allOrders.reduce((acc, order) => { acc[order.status] = (acc[order.status] || 0) + 1; return acc; }, {} as Record<string, number>);
        const orderStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count, fill: getStatusColor(status) }));

        const sixMonthsAgo = subMonths(new Date(), 5);
        const monthlyRevenueMap = allOrders.reduce((acc, order) => {
            if (order.status === 'Concluída' && order.completedAt && typeof order.completedAt.toDate === 'function') {
                const completionDate = order.completedAt.toDate();
                if (completionDate >= startOfMonth(sixMonthsAgo)) {
                    const monthKey = format(completionDate, 'yyyy-MM');
                    acc[monthKey] = (acc[monthKey] || 0) + order.totalValue;
                }
            }
            return acc;
        }, {} as Record<string, number>);
        const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
            const date = subMonths(new Date(), 5 - i);
            const monthKey = format(date, 'yyyy-MM');
            return { month: format(date, 'MMM/yy', { locale: ptBR }), total: monthlyRevenueMap[monthKey] || 0 };
        });
        setChartData({ orderStatus, monthlyRevenue });

        const recentOrders = [...allOrders].sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).slice(0,3);
        const recentCustomers = [...allCustomers].sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).slice(0,3);
        const recentQuotesActivity = [...allQuotes].filter(q => !q.isTemplate).sort((a,b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()).slice(0,3);
        
        const ordersActivity: RecentActivity[] = recentOrders.map(data => ({ id: data.id, type: 'serviço', description: `Nova OS: ${data.serviceType} para ${data.clientName}`, timestamp: data.createdAt.toDate(), href: `/dashboard/servicos/${data.id}`}));
        const customersActivity: RecentActivity[] = recentCustomers.map(data => ({ id: data.id, type: 'cliente', description: `Novo cliente: ${data.name}`, timestamp: data.createdAt.toDate(), href: `/dashboard/base-de-clientes/${data.id}`}));
        const quotesActivity: RecentActivity[] = recentQuotesActivity.map(data => ({ id: data.id, type: 'orçamento', description: `Orçamento para ${data.clientName}`, timestamp: data.createdAt.toDate(), href: `/dashboard/orcamentos/${data.id}`}));
        
        const combined = [...ordersActivity, ...customersActivity, ...quotesActivity].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
        setRecentActivity(combined);
    } catch (error) { console.error("Error fetching dashboard data: ", error); } finally { setLoading(false); }
  }, [user, settings]);
  
  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const performSearch = useCallback(async (term: string) => {
    if (!user || term.length < 2) { setSearchResults([]); return; }
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
      
      const customerResults: SearchResult[] = customersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer)).filter(c => (c.name && c.name.toLowerCase().includes(lowerTerm)) || (c.phone && c.phone.includes(lowerTerm))).map(doc => ({ id: doc.id, type: 'Cliente', title: doc.name, description: doc.phone, href: `/dashboard/base-de-clientes/${doc.id}` })).slice(0, 5);
      const orderResults: SearchResult[] = ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ServiceOrder)).filter(o => (o.serviceType && o.serviceType.toLowerCase().includes(lowerTerm)) || (o.clientName && o.clientName.toLowerCase().includes(lowerTerm))).map(doc => ({ id: doc.id, type: 'Serviço', title: doc.serviceType, description: `Cliente: ${doc.clientName}`, href: `/dashboard/servicos/${doc.id}` })).slice(0, 5);
      const quoteResults: SearchResult[] = quotesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Quote)).filter(q => (q.title && q.title.toLowerCase().includes(lowerTerm)) || (q.clientName && q.clientName.toLowerCase().includes(lowerTerm)) || (q.id && q.id.toLowerCase().includes(lowerTerm))).map(doc => ({ id: doc.id, type: 'Orçamento', title: `Orçamento para ${doc.clientName}`, description: `ID: ...${doc.id.slice(-4)}`, href: `/dashboard/orcamentos/${doc.id}` })).slice(0, 5);
      const collaboratorResults: SearchResult[] = collaboratorsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Collaborator)).filter(m => (m.name && m.name.toLowerCase().includes(lowerTerm))).map(doc => ({ id: doc.id, type: 'Colaborador', title: doc.name, description: 'Colaborador / Setor', href: `/dashboard/colaboradores/${doc.id}` })).slice(0, 5);
      
      setSearchResults([...customerResults, ...orderResults, ...quoteResults, ...collaboratorResults]);
    } catch (error) { console.error("Error performing global search:", error); } finally { setSearchLoading(false); }
  }, [user]);

  useEffect(() => { const debounce = setTimeout(() => { performSearch(searchTerm); }, 300); return () => clearTimeout(debounce); }, [searchTerm, performSearch]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) { setIsPopoverOpen(false); } }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const handleToggleVisibility = (panelId: string) => { setVisiblePanels(prev => ({...prev, [panelId]: !prev[panelId]})); };

  const getDueDateStatus = (dueDate: Date) => {
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { text: `Vencido`, variant: 'destructive' as const };
    }
    if (isToday(dueDate)) {
      return { text: 'Vence Hoje', variant: 'secondary' as const, className: 'text-amber-600 border-amber-600' };
    }
    return null;
  };

  const panels = useMemo(() => ({
    'active-orders': {
      title: 'O.S. Ativas',
      content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">O.S. Ativas</CardTitle><Wrench className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats.activeOrders}</div><p className="text-xs text-muted-foreground">Serviços em andamento</p></CardContent></Card>
    },
    'pending-quotes': {
      title: 'Orçamentos Pendentes',
      content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Orçamentos Pendentes</CardTitle><Hourglass className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats.pendingQuotes}</div><p className="text-xs text-muted-foreground">Aguardando aprovação</p></CardContent></Card>
    },
    'overdue-orders': {
      title: 'Serviços Vencidos',
      content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Serviços Vencidos</CardTitle><AlertTriangle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{loading ? <Skeleton className="h-8 w-12" /> : stats.overdueOrders}</div><p className="text-xs text-muted-foreground">Que passaram do prazo</p></CardContent></Card>
    },
    'total-customers': {
      title: 'Total de Clientes',
      content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Clientes</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats.totalCustomers}</div><p className="text-xs text-muted-foreground">Clientes na sua base</p></CardContent></Card>
    },
    'quick-action-buttons': {
        title: 'Ações Rápidas',
        content: (
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Ações Rápidas</CardTitle>
                    <CardDescription>Crie novos registros com um clique.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow justify-center">
                    <div className="grid grid-cols-2 gap-4">
                        <Button asChild variant="outline" className="h-24 flex-col gap-2 p-4 text-center">
                            <Link href="/dashboard/servicos/criar">
                                <PlusCircle className="h-8 w-8 text-primary" />
                                <span className="text-sm font-medium">Nova O.S.</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-24 flex-col gap-2 p-4 text-center">
                            <Link href="/dashboard/orcamentos/criar">
                                <FilePlus className="h-8 w-8 text-primary" />
                                <span className="text-sm font-medium">Novo Orçamento</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-24 flex-col gap-2 p-4 text-center">
                            <Link href="/dashboard/base-de-clientes">
                                <UserPlus className="h-8 w-8 text-primary" />
                                <span className="text-sm font-medium">Novo Cliente</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-24 flex-col gap-2 p-4 text-center">
                            <Link href="/dashboard/colaboradores">
                                <Briefcase className="h-8 w-8 text-primary" />
                                <span className="text-sm font-medium">Novo Colaborador</span>
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    },
    'critical-deadlines': {
        title: 'Prazos Críticos',
        content: (
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarClock /> Prazos Críticos</CardTitle>
                    <CardDescription>Serviços vencidos ou vencendo hoje.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    {loading ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : criticalDeadlines.length > 0 ? (
                        <div className="space-y-2">
                            {criticalDeadlines.map(order => {
                                const status = getDueDateStatus(order.dueDate.toDate());
                                if (!status) return null;
                                return (
                                    <Link key={order.id} href={`/dashboard/servicos/${order.id}`} className="block p-2 rounded-lg hover:bg-secondary transition-colors text-sm">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium truncate">{order.serviceType}</p>
                                                <p className="text-xs text-muted-foreground">{order.clientName}</p>
                                            </div>
                                            <Badge variant={status.variant} className={status.className}>{status.text}</Badge>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-center text-muted-foreground py-4">Nenhum prazo crítico. Bom trabalho!</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter><Button asChild variant="secondary" size="sm" className="w-full"><Link href="/dashboard/prazos">Ver todos os prazos</Link></Button></CardFooter>
            </Card>
        )
    },
    'order-status-chart': {
      title: 'Ordens por Status',
      content: <OrderStatusChart data={chartData.orderStatus} />
    },
    'monthly-revenue-chart': {
      title: 'Faturamento Mensal',
      content: <MonthlyRevenueChart data={chartData.monthlyRevenue} />
    },
    'recent-activity': {
      title: 'Atividade Recente',
      content: (
        <Card className='h-full flex flex-col'>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><History /> Atividade Recente</CardTitle>
              <CardDescription>Últimas movimentações no sistema.</CardDescription>
          </CardHeader>
          <CardContent className='flex-grow'>{loading ? <div className='flex justify-center items-center h-full'><Loader2 className="h-6 w-6 animate-spin" /></div> : (recentActivity.length > 0 ? (<ul className="space-y-4">{recentActivity.map(activity => (<li key={activity.id} className="flex items-start gap-3"><div className="mt-1">{getSearchIcon(activity.type === 'serviço' ? 'Serviço' : activity.type === 'orçamento' ? 'Orçamento' : 'Cliente')}</div><div className="flex-1"><Link href={activity.href} className="hover:underline"><p className="text-sm">{activity.description}</p></Link><p className="text-xs text-muted-foreground">{formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}</p></div></li>))}</ul>) : <p className="text-sm text-center text-muted-foreground py-4">Nenhuma atividade recente.</p>)}</CardContent>
          <CardFooter><Button asChild variant="secondary" className="w-full"><Link href="/dashboard/atividades">Ver todo o histórico</Link></Button></CardFooter>
        </Card>
      )
    },
  }), [stats, loading, criticalDeadlines, chartData, recentActivity]);
  
  if (!isMounted) return <DashboardSkeleton />;

  return (
    <div className='flex flex-col gap-6'>
        <div className="flex items-center justify-between gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Painel de Controle</h1>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Layout className="mr-2 h-4 w-4" />
                        Personalizar
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Personalizar Painel</DialogTitle>
                        <DialogDescription>Selecione os painéis que você deseja exibir.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <h3 className="mb-2 font-semibold text-lg">Métricas Rápidas</h3>
                      <div className="space-y-2">
                        {smallPanelIds.map(panelId => {
                          const panel = (panels as any)[panelId];
                          if (!panel) return null;
                          return (
                            <div key={panelId} className="flex items-center justify-between rounded-lg border p-3">
                              <Label htmlFor={`switch-${panelId}`} className="font-normal">{panel.title}</Label>
                              <Switch id={`switch-${panelId}`} checked={visiblePanels[panelId] !== false} onCheckedChange={() => handleToggleVisibility(panelId)} />
                            </div>
                          )
                        })}
                      </div>
                      <Separator />
                      <h3 className="mb-2 font-semibold text-lg">Painéis Detalhados</h3>
                      <div className="space-y-2">
                         {largePanelIds.map(panelId => {
                          const panel = (panels as any)[panelId];
                          if (!panel) return null;
                          return (
                            <div key={panelId} className="flex items-center justify-between rounded-lg border p-3">
                              <Label htmlFor={`switch-${panelId}`} className="font-normal">{panel.title}</Label>
                              <Switch id={`switch-${panelId}`} checked={visiblePanels[panelId] !== false} onCheckedChange={() => handleToggleVisibility(panelId)} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        <div className="relative w-full" ref={popoverRef}>
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                    placeholder="Buscar em todo o sistema (clientes, serviços, orçamentos...)"
                    className="w-full pl-12 h-14 text-base rounded-xl shadow-sm"
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
                    onFocus={() => { if (searchTerm.length > 1) setIsPopoverOpen(true); }}
                />
            </div>
            {isPopoverOpen && searchTerm.length > 1 && (
                <Card className="absolute z-20 w-full mt-1 shadow-lg border">
                    <CardContent className="p-0">
                        <ScrollArea className="h-60">
                            {searchLoading && <div className="p-4 text-center text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Buscando...</div>}
                            {!searchLoading && searchResults.length === 0 && searchTerm.length > 1 && (
                                <p className="p-4 text-center text-sm">Nenhum resultado encontrado.</p>
                            )}
                            {searchResults.length > 0 && (
                                searchResults.map((result) => (
                                    <Button
                                        variant="ghost"
                                        key={result.id + result.type}
                                        className="flex w-full justify-start items-center p-2 text-sm rounded-none h-auto border-b last:border-b-0"
                                        onClick={() => {
                                            router.push(result.href);
                                            setIsPopoverOpen(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        {getSearchIcon(result.type)}
                                        <div className='ml-3 text-left'>
                                            <p className='font-medium'>{result.title}</p>
                                            <p className="text-xs text-muted-foreground">{result.description}</p>
                                        </div>
                                    </Button>
                                ))
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>


        {loading ? <DashboardSkeleton /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {smallPanelIds.map(panelId => {
                  const panel = (panels as any)[panelId];
                  if (!panel || visiblePanels[panelId] === false) return null;
                  return <div key={panelId}>{panel.content}</div>;
                })}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {largePanelIds.map(panelId => {
                  const panel = (panels as any)[panelId];
                  if (!panel || visiblePanels[panelId] === false) return null;
                  return <div key={panelId} className="flex flex-col">{panel.content}</div>;
                })}
            </div>
          </div>
        )}
    </div>
  );
}
