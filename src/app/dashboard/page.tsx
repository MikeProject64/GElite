

'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Wrench, Users, FileText, CalendarClock, Briefcase, Package, FileSignature, Activity, Layout, BellRing, Search, Settings, Lock } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp, onSnapshot, addDoc, deleteDoc, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { RecentActivity, ServiceOrder, Quote, Customer, Collaborator, QuickNote, SystemUser, InventoryItem, ServiceAgreement } from '@/types';
import Link from 'next/link';
import { formatDistanceToNow, format, subMonths, startOfMonth, isPast, isToday, startOfISOWeek, endOfISOWeek, endOfMonth, addDays, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { OrderStatusChart } from '@/components/dashboard/order-status-chart';
import { MonthlyRevenueChart } from '@/components/dashboard/monthly-revenue-chart';
import { ServiceTypeChart } from '@/components/dashboard/service-type-chart';
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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { NotificationsPanel } from '@/components/dashboard/notifications-panel';
import { ProtectedComponent } from '@/components/security/protected-component';


function WaitingForPermissions() {
  return (
    <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <Lock className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">Aguardando Permissões</CardTitle>
                <CardDescription>
                    Sua conta está ativa, mas você ainda não tem permissão para acessar nenhuma área.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Por favor, peça ao administrador ou dono da sua conta para ir em <span className="font-semibold text-foreground">"Acessos da Equipe"</span> e atribuir as permissões necessárias para você começar a trabalhar.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}


// --- ESTRUTURA DE DADOS E MAPEAMENTO DE COMPONENTES ---

interface SearchResult {
  id: string;
  type: 'Cliente' | 'Serviço' | 'Orçamento' | 'Colaborador';
  title: string;
  description: string;
  href: string;
}

const SearchResult: React.FC<SearchResult> = ({ type, title, description, href }) => (
  <Link href={href} className="block p-3 hover:bg-muted/50 rounded-lg">
    <div className="flex justify-between items-center">
      <p className="font-semibold">{title}</p>
      <Badge variant="outline">{type}</Badge>
    </div>
    <p className="text-sm text-muted-foreground">{description}</p>
  </Link>
);


const panelComponents: Record<string, React.FC<{ accountId: string | null }>> = {
  servicos: ServicosPanel,
  orcamentos: OrcamentosPanel,
  prazos: PrazosPanel,
  atividades: AtividadesPanel,
  clientes: ClientesPanel,
  colaboradores: ColaboradoresPanel,
  inventario: InventarioPanel,
  contratos: ContratosPanel,
};

const FEATURE_PANELS = [
  {
    key: 'servicos',
    label: 'Serviços',
    icon: <Wrench className="h-8 w-8 text-primary" />,
    href: '/dashboard/servicos',
    description: 'Gerencie ordens de serviço, acompanhe o andamento e otimize sua operação.',
    functionId: 'servicos' // Adicionando a functionId correspondente
  },
  {
    key: 'orcamentos',
    label: 'Orçamentos',
    icon: <FileText className="h-8 w-8 text-primary" />,
    href: '/dashboard/orcamentos',
    description: 'Crie, envie e acompanhe orçamentos para seus clientes.',
    functionId: 'orcamentos' // Adicionando a functionId correspondente
  },
  {
    key: 'prazos',
    label: 'Prazos',
    icon: <CalendarClock className="h-8 w-8 text-primary" />,
    href: '/dashboard/prazos',
    description: 'Controle prazos e deadlines importantes para não perder nenhum compromisso.',
    functionId: 'prazos' // Adicionando a functionId correspondente
  },
  {
    key: 'atividades',
    label: 'Atividades',
    icon: <Activity className="h-8 w-8 text-primary" />,
    href: '/dashboard/atividades',
    description: 'Organize e acompanhe as atividades da sua equipe.',
    functionId: 'atividades' // Adicionando a functionId correspondente
  },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: <Users className="h-8 w-8 text-primary" />,
    href: '/dashboard/base-de-clientes',
    description: 'Gerencie sua base de clientes e histórico de atendimentos.',
    functionId: 'clientes' // Adicionando a functionId correspondente
  },
  {
    key: 'colaboradores',
    label: 'Colaboradores',
    icon: <Briefcase className="h-8 w-8 text-primary" />,
    href: '/dashboard/colaboradores',
    description: 'Controle sua equipe e distribua tarefas de forma eficiente.',
    functionId: 'colaboradores' // Adicionando a functionId correspondente
  },
  {
    key: 'inventario',
    label: 'Inventário',
    icon: <Package className="h-8 w-8 text-primary" />,
    href: '/dashboard/inventario',
    description: 'Gerencie o estoque de produtos e materiais utilizados nos serviços.',
    functionId: 'inventario' // Adicionando a functionId correspondente
  },
  {
    key: 'contratos',
    label: 'Contratos',
    icon: <FileSignature className="h-8 w-8 text-primary" />,
    href: '/dashboard/contratos',
    description: 'Administre contratos de manutenção e acordos com clientes.',
    functionId: 'contratos' // Adicionando a functionId correspondente
  },
];

// --- HOOKS DE DADOS ---

const STATUS_COLORS = {
  'Pendente': '#FACC15', // amarelo
  'Em Andamento': '#3380CC', // azul
  'Concluída': '#22C55E', // verde
  'Cancelada': '#EF4444', // vermelho
  'Aguardando Peças': '#FB923C', // laranja
};

function useServiceOrdersData(accountId: string | null) {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'serviceOrders'), where('userId', '==', accountId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar ordens de serviço:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [accountId]);

  // Métricas
  const now = new Date();
  const startOfWeek = startOfISOWeek(now);
  const endOfWeek = endOfISOWeek(now);

  const emAndamento = orders.filter(o => o.status === 'Em Andamento').length;
  const concluidasHoje = orders.filter(o => o.status === 'Concluída' && o.completedAt && isToday(o.completedAt.toDate())).length;
  const concluidasSemana = orders.filter(o => o.status === 'Concluída' && o.completedAt && o.completedAt.toDate() >= startOfWeek && o.completedAt.toDate() <= endOfWeek).length;
  const pendentes = orders.filter(o => o.status === 'Pendente').length;
  const aguardandoPecas = orders.filter(o => o.status === 'Aguardando Peças').length;

  // Dados para gráfico
  const statusCounts = orders.reduce((acc, o) => {
    if (!o.status) return acc;
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const chartData = Object.entries(statusCounts).map(([status, count]) => ({ status, count: count as number }));

  return {
    loading,
    emAndamento,
    concluidasHoje,
    concluidasSemana,
    pendentes,
    aguardandoPecas,
    chartData,
    total: orders.length,
  };
}

function useCustomersData(accountId: string | null) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'customers'), where('userId', '==', accountId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar clientes:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [accountId]);

  // Métricas
  const thirtyDaysAgo = subMonths(new Date(), 1);
  const newCustomersLast30Days = customers.filter(c => c.createdAt.toDate() > thirtyDaysAgo).length;
  const totalCustomers = customers.length;

  return {
    loading,
    newCustomersLast30Days,
    totalCustomers,
  };
}

function useQuotesData(accountId: string | null) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'quotes'), where('userId', '==', accountId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote)));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar orçamentos:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [accountId]);

  // Métricas
  const thirtyDaysAgo = subMonths(new Date(), 1);
  const startOfCurrentMonth = startOfMonth(new Date());

  const aguardandoAprovacao = quotes.filter(q => q.status === 'Pendente');
  const aprovadosNoMes = quotes.filter(q => q.status === 'Aprovado' && q.createdAt.toDate() >= startOfCurrentMonth);
  
  const quotesLast30Days = quotes.filter(q => q.createdAt.toDate() >= thirtyDaysAgo);
  const approvedLast30Days = quotesLast30Days.filter(q => q.status === 'Aprovado' || q.status === 'Convertido').length;
  const refusedLast30Days = quotesLast30Days.filter(q => q.status === 'Recusado').length;
  const totalHandledLast30Days = approvedLast30Days + refusedLast30Days;
  const approvalRate = totalHandledLast30Days > 0 ? (approvedLast30Days / totalHandledLast30Days) * 100 : 0;

  const totalAguardandoAprovacao = aguardandoAprovacao.reduce((sum, q) => sum + q.totalValue, 0);

  return {
    loading,
    aguardandoAprovacaoCount: aguardandoAprovacao.length,
    aprovadosNoMesCount: aprovadosNoMes.length,
    totalAguardandoAprovacao,
    approvalRate,
  };
}

function useDeadlinesData(accountId: string | null) {
  const [deadlines, setDeadlines] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    // CORREÇÃO: Remover cláusula 'where' inválida ('isTemplate', '!=', true)
    // e filtrar no lado do cliente, assim como a página principal de Prazos faz.
    const q = query(
      collection(db, 'serviceOrders'), 
      where('userId', '==', accountId),
      orderBy('dueDate', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filteredOrders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder))
        .filter(order => !!order.dueDate && !order.isTemplate); // Filtro aplicado aqui
      setDeadlines(filteredOrders);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar prazos (OS):", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [accountId]);

  const sortedDeadlines = deadlines
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime()
    });

  return {
    loading,
    sortedDeadlines,
  };
}

interface ActivityLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  collectionName: string;
  activityType: 'create' | 'update' | 'delete' | 'statusChange';
  documentId: string;
  timestamp: Timestamp;
  description: string;
  details?: any;
}

function useRecentActivitiesData(accountId: string | null) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      try {
        const collectionsToQuery = ['serviceOrders', 'quotes', 'customers'];
        let allLogs: ActivityLogEntry[] = [];

        for (const collectionName of collectionsToQuery) {
          const q = query(collection(db, collectionName), where('userId', '==', accountId));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.activityLog && Array.isArray(data.activityLog)) {
              // Adicionando o nome da entidade para contexto, se disponível
              const entityName = data.name || data.title || data.serviceType || '';
              const logsWithContext = data.activityLog.map((log: ActivityLogEntry) => ({
                ...log,
                description: `${log.description} em ${entityName}`.trim()
              }));
              allLogs.push(...logsWithContext);
            }
          });
        }

        // Ordenar todos os logs combinados pela data mais recente
        allLogs.sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
        
        // Pegar apenas as 3 mais recentes
        setActivities(allLogs.slice(0, 3));

      } catch (error) {
        console.error("Erro ao buscar atividades recentes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [accountId]);

  return {
    loading,
    activities,
  };
}

function useCollaboratorsData(accountId: string | null) {
  const [collaboratorsWithTasks, setCollaboratorsWithTasks] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    const fetchCollaboratorData = async () => {
      setLoading(true);
      try {
        // 1. Buscar todos os colaboradores
        const collaboratorsQuery = query(collection(db, 'collaborators'), where('userId', '==', accountId));
        const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
        const collaborators = collaboratorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));

        // 2. Buscar todas as tarefas ativas
        const tasksQuery = query(
          collection(db, 'serviceOrders'), 
          where('userId', '==', accountId),
          where('status', 'in', ['Pendente', 'Em Andamento', 'Aguardando Peças'])
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const activeTasks = tasksSnapshot.docs.map(doc => doc.data() as ServiceOrder);

        // 3. Mapear tarefas para cada colaborador
        const collaboratorsWithTaskCounts = collaborators.map(c => {
          const taskCount = activeTasks.filter(task => task.collaboratorId === c.id).length;
          return { ...c, activeTaskCount: taskCount };
        });

        setCollaboratorsWithTasks(collaboratorsWithTaskCounts);
      } catch (error) {
        console.error("Erro ao buscar dados de colaboradores e tarefas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollaboratorData();
  }, [accountId]);

  return {
    loading,
    collaborators: collaboratorsWithTasks,
  };
}

function useInventoryData(accountId: string | null) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'inventory'), where('userId', '==', accountId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar itens do inventário:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [accountId]);

  // Métricas
  const ninetyDaysAgo = subDays(new Date(), 90);
  const lowStockItemsCount = items.filter(item => (item.minStock || 0) > 0 && item.quantity <= item.minStock!).length;
  const totalStockValue = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  const staleItemsCount = items.filter(item => item.updatedAt.toDate() < ninetyDaysAgo).length;
  
  return {
    loading,
    lowStockItemsCount,
    totalStockValue,
    staleItemsCount,
  };
}

function useAgreementsData(accountId: string | null) {
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'serviceAgreements'), where('userId', '==', accountId), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgreements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceAgreement)));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar contratos:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [accountId]);

  // Métricas
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  const expiringSoonCount = agreements.filter(a => {
    if (!a.nextDueDate) return false;
    const dueDate = a.nextDueDate.toDate();
    return dueDate >= now && dueDate <= thirtyDaysFromNow;
  }).length;
  
  return {
    loading,
    expiringSoonCount,
  };
}


// --- COMPONENTES DOS PAINÉIS (WIDGETS) ---

function ServicosPanel({ accountId }: { accountId: string | null }) {
  const {
    loading,
    emAndamento,
    concluidasHoje,
    concluidasSemana,
    pendentes,
    aguardandoPecas,
    chartData,
    total,
  } = useServiceOrdersData(accountId);

  const MetricRow = ({ label, value, status }: { label: string; value: number; status: string }) => (
    <Link href={`/dashboard/servicos?status=${encodeURIComponent(status)}`} className="flex items-center justify-between group py-1">
      <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
      <span className="font-bold text-base text-foreground">{value}</span>
    </Link>
  );

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <Wrench className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Serviços</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center items-center gap-4">
        {loading ? (
          <div className="flex w-full gap-4">
            <Skeleton className="h-24 w-1/2" />
            <Skeleton className="h-24 w-1/2 rounded-full" />
          </div>
        ) : (
          <div className="flex w-full items-center">
            <div className="flex-1 flex flex-col gap-1 pr-4">
              <MetricRow label="Em Andamento" value={emAndamento} status="Em Andamento" />
              <MetricRow label="Pendentes" value={pendentes} status="Pendente" />
              <MetricRow label="Aguardando Peças" value={aguardandoPecas} status="Aguardando Peças" />
              <MetricRow label="Concluídas Hoje" value={concluidasHoje} status="Concluída" />
            </div>
            <div className="flex justify-center items-center h-24 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={40}
                    paddingAngle={3}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={`cell-${entry.status}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--popover))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      color: 'hsl(var(--popover-foreground))'
                    }}
                    formatter={(value, name) => [`${value} OS`, name]} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between mt-2">
        <Button asChild size="sm" className="w-auto">
          <Link href="/dashboard/servicos/criar">+ Nova Ordem de Serviço</Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="w-auto">
          <Link href="/dashboard/servicos">Ver Todos</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function OrcamentosPanel({ accountId }: { accountId: string | null }) {
  const { loading, aguardandoAprovacaoCount, aprovadosNoMesCount, totalAguardandoAprovacao, approvalRate } = useQuotesData(accountId);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Orçamentos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1 justify-center">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
              <p className="text-3xl font-bold">{aguardandoAprovacaoCount}</p>
              <p className="text-lg font-semibold text-primary">{formatCurrency(totalAguardandoAprovacao)}</p>
            </div>
             <Separator />
            <div className="flex justify-around items-center">
              <div>
                <p className="text-sm text-muted-foreground">Aprovados no Mês</p>
                <p className="text-3xl font-bold">{aprovadosNoMesCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
                <p className="text-3xl font-bold">{approvalRate.toFixed(0)}<span className="text-xl">%</span></p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between mt-2">
        <Button asChild size="sm" className="w-auto">
          <Link href="/dashboard/orcamentos/criar">+ Criar Novo Orçamento</Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="w-auto">
          <Link href="/dashboard/orcamentos">Ver Todos</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function PrazosPanel({ accountId }: { accountId: string | null }) {
  const { loading, sortedDeadlines } = useDeadlinesData(accountId);

  const DeadlineItem = ({ deadline }: { deadline: ServiceOrder }) => {
    if (!deadline.dueDate) return null; // Adiciona verificação
    const dueDate = deadline.dueDate.toDate();
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueToday = isToday(dueDate);

    const badgeClass = cn({
      'bg-red-500 text-red-50': isOverdue,
      'bg-amber-500 text-amber-50': isDueToday,
      'bg-muted text-muted-foreground': !isOverdue && !isDueToday,
    });
    
    return (
      <div className="flex items-center justify-between gap-4 py-2 border-b border-dashed">
        <span className="text-sm font-medium truncate">{deadline.serviceType || 'Serviço sem título'}</span>
        <Badge variant="outline" className={cn("text-xs font-semibold", badgeClass)}>
          {isOverdue ? 'Atrasado' : format(dueDate, 'dd/MM')}
        </Badge>
      </div>
    );
  };
  
  // Lógica de exibição corrigida para filtrar status irrelevantes
  const displayDeadlines = sortedDeadlines
    .filter(order => order.status !== 'Concluída' && order.status !== 'Cancelada')
    .slice(0, 3);

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <CalendarClock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Prazos e Compromissos</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-4">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="mt-2">
            {displayDeadlines.length > 0 ? (
              displayDeadlines.map(d => <DeadlineItem key={d.id} deadline={d} />)
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Nenhum compromisso à vista.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end mt-2">
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href="/dashboard/prazos">Ver Agenda Completa</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function AtividadesPanel({ accountId }: { accountId: string | null }) {
  const { loading, activities } = useRecentActivitiesData(accountId);

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1 justify-center px-4 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {activities.length > 0 ? (
              activities.map(activity => (
                <div key={activity.timestamp.toMillis()} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm leading-tight">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.userEmail.split('@')[0]} - {formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end mt-2">
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href="/dashboard/atividades">Ver Todas</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ClientesPanel({ accountId }: { accountId: string | null }) {
  const { loading, newCustomersLast30Days, totalCustomers } = useCustomersData(accountId);

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Clientes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1 justify-center">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Novos Clientes (30 dias)</p>
              <p className="text-4xl font-bold">{newCustomersLast30Days}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total de Clientes Ativos</p>
              <p className="text-4xl font-bold">{totalCustomers}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end mt-2">
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard/base-de-clientes/criar">+ Adicionar Novo Cliente</Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href="/dashboard/base-de-clientes">Ver Todos</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ColaboradoresPanel({ accountId }: { accountId: string | null }) {
  const { loading, collaborators } = useCollaboratorsData(accountId);

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Carga de Trabalho da Equipe</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {collaborators.length > 0 ? (
              collaborators
                .sort((a, b) => (b.activeTaskCount || 0) - (a.activeTaskCount || 0))
                .map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <Badge variant="secondary" className="font-semibold">{c.activeTaskCount || 0} tarefas</Badge>
                  </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Nenhum colaborador encontrado.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-end mt-2">
        <Button asChild size="sm" variant="secondary">
          <Link href="/dashboard/colaboradores">Ver Equipe</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function InventarioPanel({ accountId }: { accountId: string | null }) {
  const { loading, lowStockItemsCount, totalStockValue, staleItemsCount } = useInventoryData(accountId);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Card className="h-[350px] flex flex-col relative">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-3 bg-primary/10 rounded-full">
                <Package className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-headline text-lg">Inventário</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 justify-center pb-20">
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-12 w-1/2 mx-auto" />
                </div>
            ) : (
                <div className="flex flex-col gap-4 text-center">
                    <div className="px-6 py-4 rounded-lg bg-destructive/10">
                        <p className="text-sm text-destructive font-semibold">Itens com Estoque Baixo</p>
                        <p className="text-5xl font-bold text-destructive">{lowStockItemsCount}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Valor Total do Estoque</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalStockValue)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Itens parados (+90 dias)</p>
                        <p className="text-2xl font-bold">{staleItemsCount}</p>
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter className="absolute bottom-0 left-0 right-0 flex items-center justify-between">
             <Button asChild size="sm" variant="secondary">
                <Link href="/dashboard/inventario">Ver Inventário</Link>
            </Button>
        </CardFooter>
    </Card>
  );
}

function ContratosPanel({ accountId }: { accountId: string | null }) {
  const { loading, expiringSoonCount } = useAgreementsData(accountId);

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <FileSignature className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Contratos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 flex-1 justify-center">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-12 w-1/2 mx-auto" />
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-center">
            <p className="text-lg text-muted-foreground">Contratos a Vencer <br/>(próximos 30 dias)</p>
            <p className="text-6xl font-bold text-primary">{expiringSoonCount}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end mt-2">
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href="/dashboard/contratos">Gerenciar Contratos</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


// --- COMPONENTE PRINCIPAL DA PÁGINA ---

export default function DashboardPage() {
  const { user, systemUser, activeAccountId, isTeamMember, loading, effectiveAllowedFunctions } = useAuth();
  const { settings } = useSettings();
  const [isMounted, setIsMounted] = useState(false);
  const [visiblePanels, setVisiblePanels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedVisible = localStorage.getItem('dashboard-feature-panels');
      if (storedVisible) {
        const parsed = JSON.parse(storedVisible);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          setVisiblePanels(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not load panel settings from localStorage.", e);
    }
  }, []);

  useEffect(() => {
    if (isMounted) localStorage.setItem('dashboard-feature-panels', JSON.stringify(visiblePanels));
  }, [visiblePanels, isMounted]);

  // Filtra funcionalidades liberadas com base nas configurações
  const enabledPanels = useMemo(() => FEATURE_PANELS.filter(panel =>
    settings.featureFlags &&
    Object.prototype.hasOwnProperty.call(settings.featureFlags, panel.key) &&
    settings.featureFlags[panel.key as keyof typeof settings.featureFlags]
  ), [settings.featureFlags]);

  // Enquanto as permissões carregam, exibe um skeleton.
  if (loading || !isMounted) {
    return <DashboardSkeleton />;
  }

  // Se for membro da equipe e não tiver nenhuma permissão, mostra a tela de espera.
  if (isTeamMember && effectiveAllowedFunctions.length === 0) {
    return <WaitingForPermissions />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Painel de Controle</h1>
          {systemUser?.name && (
            <p className="text-muted-foreground text-base mt-1">Bem-vindo(a), <span className="font-semibold text-primary">{systemUser.name.split(' ')[0]}</span>!</p>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Layout className="mr-2 h-4 w-4" />
              Personalizar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Personalizar Painéis</DialogTitle>
              <DialogDescription>Ative ou desative os painéis que deseja visualizar.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 py-4 pr-4">
                {enabledPanels.map(panel => (
                  <div key={panel.key} className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor={`switch-${panel.key}`} className="font-normal">{panel.label}</Label>
                    <Switch id={`switch-${panel.key}`} checked={visiblePanels[panel.key] !== false} onCheckedChange={() => setVisiblePanels(prev => ({ ...prev, [panel.key]: !prev[panel.key] }))} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NotificationsPanel />
        {enabledPanels.map(panel => {
          if (visiblePanels[panel.key] === false) return null;

          const PanelComponent = panelComponents[panel.key];

          if (PanelComponent) {
            return (
              <ProtectedComponent key={panel.key} functionId={panel.functionId}>
                <PanelComponent accountId={activeAccountId} />
              </ProtectedComponent>
            );
          }

          // Renderiza o card genérico para painéis ainda não implementados
          return (
            <ProtectedComponent key={panel.key} functionId={panel.functionId}>
              <Link href={panel.href} className="group">
                <Card className="h-[350px] transition-shadow group-hover:shadow-lg cursor-pointer flex flex-col justify-between">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                      {panel.icon}
                    </div>
                    <CardTitle className="font-headline text-lg">{panel.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{panel.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </ProtectedComponent>
          );
        })}
      </div>
    </div>
  );
}





function GlobalSearch() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-[180px]">
          <Search className="mr-2 h-4 w-4" />
          Pesquisar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pesquisar</DialogTitle>
          <DialogDescription>
            Pesquise por clientes, serviços, orçamentos, colaboradores e mais.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Pesquisar..." className="mb-4" />
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            <SearchResult
              id="cliente1"
              type="Cliente"
              title="Cliente A"
              description="Endereço: Rua A, 123"
              href="/dashboard/base-de-clientes/cliente/cliente1"
            />
            <SearchResult
              id="servico1"
              type="Serviço"
              title="Ordem de Serviço X"
              description="Status: Em Andamento"
              href="/dashboard/servicos/ordem-de-servico/servico1"
            />
            <SearchResult
              id="orcamento1"
              type="Orçamento"
              title="Orçamento Y"
              description="Status: Pendente"
              href="/dashboard/orcamentos/orcamento/orcamento1"
            />
            <SearchResult
              id="colaborador1"
              type="Colaborador"
              title="Colaborador Z"
              description="Cargo: Técnico"
              href="/dashboard/colaboradores/colaborador/colaborador1"
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ enabledPanels, setEnabledPanels }: { enabledPanels: string[]; setEnabledPanels: (panels: string[]) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-[180px]">
          <Settings className="mr-2 h-4 w-4" />
          Painéis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Painéis</DialogTitle>
          <DialogDescription>
            Escolha quais painéis você deseja exibir no painel de controle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {FEATURE_PANELS.map((panel) => (
            <div key={panel.key} className="flex items-center">
              <Switch
                id={`panel-${panel.key}`}
                checked={enabledPanels.includes(panel.key)}
                onCheckedChange={(checked) => {
                  setEnabledPanels(checked ? [...enabledPanels, panel.key] : enabledPanels.filter(p => p !== panel.key));
                }}
              />
              <Label htmlFor={`panel-${panel.key}`} className="ml-3 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {panel.label}
              </Label>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecentActivities() {
  const { activeAccountId } = useAuth();
  const { loading, activities } = useRecentActivitiesData(activeAccountId);

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1 justify-center px-4 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {activities.length > 0 ? (
              activities.map(activity => (
                <div key={activity.timestamp.toMillis()} className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm leading-tight">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.userEmail.split('@')[0]} - {formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end mt-2">
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href="/dashboard/atividades">Ver Todas</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuickNotes() {
  const { activeAccountId } = useAuth();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeAccountId) return;
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'quickNotes'), where('userId', '==', activeAccountId));
        const querySnapshot = await getDocs(q);
        setNotes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickNote)));
      } catch (err) {
        setError('Erro ao buscar notas rápidas.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [activeAccountId]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !activeAccountId) return;
    try {
      await addDoc(collection(db, 'quickNotes'), {
        userId: activeAccountId,
        text: newNote,
        createdAt: Timestamp.now(),
      });
      setNewNote('');
      setError(null);
    } catch (err) {
      setError('Erro ao adicionar nota rápida.');
    }
  };

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="font-headline text-lg">Notas Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-4">
        {loading ? (
          <div className="space-y-3 mt-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {notes.length > 0 ? (
              notes.map(note => (
                <div key={note.id} className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{note.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma nota rápida.</p>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Nova nota rápida..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddNote();
                }}
              />
              <Button onClick={handleAddNote} className="w-auto">Adicionar</Button>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end mt-2">
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <Link href="/dashboard/notas-rapidas">Ver Todas</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-[350px] w-full" />
        ))}
      </div>
    </div>
  );
}







    