
'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wrench, Users, Loader2, History, FileText, Search, Briefcase, GripVertical, ChevronDown } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { useSettings } from '@/components/settings-provider';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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


interface SortablePanelProps {
  id: string;
  title: string;
  Icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SortableCollapsiblePanel: React.FC<SortablePanelProps> = ({ id, title, Icon, children, className, isCollapsed, onToggleCollapse }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  
  // The content of the panel is passed as children. We can inspect it to extract
  // the CardHeader description and the rest of the content.
  const cardElement = React.Children.only(children) as React.ReactElement;
  const cardHeader = React.Children.toArray(cardElement.props.children).find(
    (child: any) => child.type === CardHeader
  ) as React.ReactElement | undefined;
  
  const cardContent = React.Children.toArray(cardElement.props.children).filter(
    (child: any) => child.type !== CardHeader
  );

  const description = cardHeader?.props.children.find((c: any) => c.type === CardDescription)?.props.children;
  
  return (
    <div ref={setNodeRef} style={style} className={className}>
      <Card>
        <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapse}>
          <CardHeader className="relative pr-20">
            <CardTitle className="flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
            <div className="absolute top-3 right-2 flex items-center">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", !isCollapsed && "rotate-180")} />
                  <span className="sr-only">Recolher painel</span>
                </Button>
              </CollapsibleTrigger>
              <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab h-8 w-8">
                <GripVertical className="h-4 w-4" />
                <span className="sr-only">Arrastar painel</span>
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>{cardContent}</CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};


const initialPanelOrder = ['quick-actions', 'active-orders', 'total-customers', 'order-status-chart', 'monthly-revenue-chart', 'recent-activity', 'quick-search'];

const DashboardSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Skeleton className="lg:col-span-4 md:col-span-2 h-64" />
        <Skeleton className="lg:col-span-2 md:col-span-1 h-64" />
        <Skeleton className="lg:col-span-3 md:col-span-1 h-80" />
        <Skeleton className="lg:col-span-3 md:col-span-1 h-80" />
        <Skeleton className="lg:col-span-4 md:col-span-2 h-72" />
        <Skeleton className="lg:col-span-2 md:col-span-1 h-72" />
    </div>
);


export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();

  // Page data state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ activeOrders: 0, totalCustomers: 0, overdueOrders: 0, pendingQuotes: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<ChartData>({ orderStatus: [], monthlyRevenue: [] });
  const [criticalDeadlines, setCriticalDeadlines] = useState<ServiceOrder[]>([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Layout state
  const [panelOrder, setPanelOrder] = useState<string[]>(initialPanelOrder);
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedOrder = localStorage.getItem('dashboard-panel-order');
      if (storedOrder) {
        // Validate stored order against initialPanelOrder to prevent missing/extra panels
        const parsedOrder = JSON.parse(storedOrder);
        const validOrder = initialPanelOrder.filter(p => parsedOrder.includes(p));
        const newPanels = initialPanelOrder.filter(p => !parsedOrder.includes(p));
        if (validOrder.length > 0) setPanelOrder([...validOrder, ...newPanels]);
      }
      const storedCollapsed = localStorage.getItem('dashboard-collapsed-panels');
      if (storedCollapsed) {
        setCollapsedPanels(JSON.parse(storedCollapsed));
      }
    } catch(e) {
        console.error("Failed to load layout from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('dashboard-panel-order', JSON.stringify(panelOrder));
    }
  }, [panelOrder, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('dashboard-collapsed-panels', JSON.stringify(collapsedPanels));
    }
  }, [collapsedPanels, isMounted]);

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

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPanelOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleCollapse = (panelId: string) => {
    setCollapsedPanels(prev => ({...prev, [panelId]: !prev[panelId]}));
  };

  const panels = useMemo(() => ({
    'quick-actions': {
      id: 'quick-actions',
      title: 'Ações Rápidas',
      Icon: Activity,
      className: 'lg:col-span-4 md:col-span-3 col-span-6',
      content: <QuickActions stats={stats} loading={loading} deadlines={criticalDeadlines} />,
    },
    'active-orders': {
      id: 'active-orders',
      title: 'Ordens de Serviço Ativas',
      Icon: Wrench,
      className: 'lg:col-span-2 md:col-span-3 col-span-6',
      content: <CardContent>{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.activeOrders}</div>}<p className="text-xs text-muted-foreground">Ordens pendentes ou em andamento.</p></CardContent>
    },
    'total-customers': {
      id: 'total-customers',
      title: 'Clientes Cadastrados',
      Icon: Users,
      className: 'lg:col-span-2 md:col-span-3 col-span-6',
      content: <CardContent>{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.totalCustomers}</div>}<p className="text-xs text-muted-foreground">Total de clientes em sua base.</p></CardContent>
    },
    'order-status-chart': {
      id: 'order-status-chart',
      title: 'Ordens por Status',
      Icon: Wrench,
      className: 'lg:col-span-3 md:col-span-3 col-span-6',
      content: loading ? <CardContent className="p-6 flex justify-center items-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin" /></CardContent> : <OrderStatusChart data={chartData.orderStatus} />
    },
    'monthly-revenue-chart': {
      id: 'monthly-revenue-chart',
      title: 'Faturamento Mensal',
      Icon: FileText,
      className: 'lg:col-span-3 md:col-span-3 col-span-6',
      content: loading ? <CardContent className="p-6 flex justify-center items-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin" /></CardContent> : <MonthlyRevenueChart data={chartData.monthlyRevenue} />
    },
    'recent-activity': {
      id: 'recent-activity',
      title: 'Atividade Recente',
      Icon: History,
      className: 'lg:col-span-4 md:col-span-3 col-span-6',
      content: (
        <>
          <CardContent className='flex-grow'>{loading ? <div className='flex justify-center items-center h-full'><Loader2 className="h-6 w-6 animate-spin" /></div> : (recentActivity.length > 0 ? (<ul className="space-y-4">{recentActivity.map(activity => (<li key={activity.id} className="flex items-start gap-3"><div className="mt-1">{getSearchIcon(activity.type === 'serviço' ? 'Serviço' : activity.type === 'orçamento' ? 'Orçamento' : 'Cliente')}</div><div className="flex-1"><Link href={activity.href} className="hover:underline"><p className="text-sm">{activity.description}</p></Link><p className="text-xs text-muted-foreground">{formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}</p></div></li>))}</ul>) : <p className="text-sm text-center text-muted-foreground py-4">Nenhuma atividade recente.</p>)}</CardContent>
          <CardFooter><Button asChild variant="secondary" className="w-full"><Link href="/dashboard/atividades">Ver todo o histórico</Link></Button></CardFooter>
        </>
      )
    },
    'quick-search': {
      id: 'quick-search',
      title: 'Busca Rápida',
      Icon: Search,
      className: 'lg:col-span-2 md:col-span-3 col-span-6',
      content: (
        <CardContent>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild className='w-full'><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" /><Input placeholder="Buscar em todo o sistema..." className="w-full pl-10" value={searchTerm} onChange={(e) => { const term = e.target.value; setSearchTerm(term); if (term.length > 1) { setIsPopoverOpen(true); } else { setIsPopoverOpen(false); }}}/></div></PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" ref={popoverRef}>
              <ScrollArea className="h-60">{searchLoading && <p className="p-4 text-center text-sm">Buscando...</p>}{!searchLoading && searchResults.length === 0 && searchTerm.length > 1 && (<p className="p-4 text-center text-sm">Nenhum resultado encontrado.</p>)}{searchResults.length > 0 && (searchResults.map((result) => (<Button variant="ghost" key={result.id} className="flex w-full justify-start items-center p-2 text-sm rounded-none h-auto" onClick={() => { router.push(result.href); setIsPopoverOpen(false); setSearchTerm('');}}>{getSearchIcon(result.type)}<div className='ml-2 text-left'><p className='font-medium'>{result.title}</p><p className="text-xs text-muted-foreground">{result.description}</p></div></Button>)))}</ScrollArea>
            </PopoverContent>
          </Popover>
        </CardContent>
      )
    },
  }), [stats, loading, criticalDeadlines, chartData, recentActivity, isPopoverOpen, searchTerm, searchResults, searchLoading, router]);
  
  if (!isMounted) return <DashboardSkeleton />;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={panelOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {panelOrder.map(panelId => {
            const panel = (panels as any)[panelId];
            if (!panel) return null;
            
            // This is a bit of a hack to recreate the original Card component structure for the panel
            const cardChildren = (
              <Card>
                <CardHeader>
                  <CardTitle>{panel.title}</CardTitle>
                  <CardDescription>{panel.description}</CardDescription>
                </CardHeader>
                {panel.content}
              </Card>
            );

            return (
              <SortableCollapsiblePanel
                key={panelId}
                id={panelId}
                title={panel.title}
                Icon={panel.Icon}
                className={panel.className}
                isCollapsed={!!collapsedPanels[panelId]}
                onToggleCollapse={() => handleToggleCollapse(panelId)}
              >
                {cardChildren}
              </SortableCollapsiblePanel>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
