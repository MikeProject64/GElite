
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import Link from 'next/link';

// Actions
import { getAnalyticsReports } from '../analytics/actions';
import { getStripeDashboardData } from '../stripe/actions';

// Types
import type { AnalyticsData } from '../analytics/page';
import type { StripeDashboardData } from '../stripe/page';
import type { ChartConfig } from '@/components/ui/chart';

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Icons
import {
  Users, Eye, Repeat, AlertTriangle, TrendingUp, Laptop, Smartphone, Tablet, BarChart2,
  PieChart, TrendingDown, LineChart, DollarSign, Wallet, ExternalLink, UserCheck, Layout, Loader2
} from 'lucide-react';


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const eventTranslations: { [key: string]: string } = {
  'generate_lead': 'Teste Iniciado',
  'plano_contratado': 'Plano Contratado',
  'begin_checkout': 'Iniciou Checkout'
};

const barChartConfig = {
  count: { label: "Contagem", color: "hsl(var(--chart-1))" },
  views: { label: "Visualizações", color: "hsl(var(--chart-2))" },
  users: { label: "Usuários", color: "hsl(var(--chart-3))" },
  total: { label: 'Faturamento', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

const smallPanelIds = [
    'realtime-users', 'active-users-7d', 'new-users-7d', 'conversions-7d',
    'mrr', 'revenue-30d', 'active-subs', 'arpu'
];

const largePanelIds = [
    'daily-views-chart', 'conversion-funnel', 'event-count-chart',
    'top-pages', 'device-users', 'daily-revenue-chart',
    'recent-transactions', 'subs-by-plan-chart'
];

const initialPanelOrder = [...smallPanelIds, ...largePanelIds];

const initialPanelVisibility = initialPanelOrder.reduce((acc, id) => ({ ...acc, [id]: true }), {});

// === Main Dashboard Page Component ===
export default function AdminDashboardPage() {
    const { toast } = useToast();

    // Data State
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [stripeData, setStripeData] = useState<Omit<StripeDashboardData, 'success' | 'message'>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Layout State
    const [visiblePanels, setVisiblePanels] = useState<Record<string, boolean>>(initialPanelVisibility);
    const [isMounted, setIsMounted] = useState(false);
    const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);

    // Load layout from localStorage
    useEffect(() => {
        setIsMounted(true);
        try {
            const storedVisible = localStorage.getItem('dashboard-visible-panels');
            if (storedVisible) {
                const parsedVisible = JSON.parse(storedVisible);
                // Ensure all panels have an entry
                const updatedVisible = initialPanelOrder.reduce((acc, id) => {
                    acc[id] = parsedVisible[id] !== false; // Default to true if not found
                    return acc;
                }, {} as Record<string, boolean>);
                setVisiblePanels(updatedVisible);
            }
        } catch(e) { console.error("Failed to load layout from localStorage", e); }
    }, []);

    // Save layout to localStorage
    useEffect(() => { if (isMounted) localStorage.setItem('dashboard-visible-panels', JSON.stringify(visiblePanels)); }, [visiblePanels, isMounted]);

    // Fetch all data
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            const [analyticsResult, stripeResult] = await Promise.allSettled([
                getAnalyticsReports(),
                getStripeDashboardData()
            ]);

            let errors: string[] = [];
            if (analyticsResult.status === 'fulfilled' && analyticsResult.value.success) {
                setAnalyticsData(analyticsResult.value.data!);
            } else {
                const message = (analyticsResult as PromiseFulfilledResult<any>).value?.message || (analyticsResult as PromiseRejectedResult).reason?.message || 'Falha ao buscar dados do Analytics.';
                errors.push(`Analytics: ${message}`);
            }

            if (stripeResult.status === 'fulfilled' && stripeResult.value.success) {
                setStripeData(stripeResult.value);
            } else {
                const message = (stripeResult as PromiseFulfilledResult<any>).value?.message || (stripeResult as PromiseRejectedResult).reason?.message || 'Falha ao buscar dados do Stripe.';
                errors.push(`Stripe: ${message}`);
            }

            if(errors.length > 0) {
                setError(errors.join(' | '));
                toast({ variant: 'destructive', title: 'Erro ao Carregar Painel', description: errors.join(' ')});
            }
            setLoading(false);
        }
        fetchData();
    }, [toast]);

    const handleToggleVisibility = (panelId: string) => { setVisiblePanels(prev => ({...prev, [panelId]: !prev[panelId]})); };

    const deviceIconMap: { [key: string]: React.ReactNode } = {
        'Desktop': <Laptop className="h-4 w-4 text-muted-foreground" />,
        'Mobile': <Smartphone className="h-4 w-4 text-muted-foreground" />,
        'Tablet': <Tablet className="h-4 w-4 text-muted-foreground" />,
    };

    const funnel = analyticsData?.conversionFunnel;
    const leadConversionRate = funnel && funnel.newUsers > 0 ? (funnel.generatedLeads / funnel.newUsers) * 100 : 0;
    const purchaseConversionRate = funnel && funnel.generatedLeads > 0 ? (funnel.purchasedPlans / funnel.generatedLeads) * 100 : 0;

    const pieChartConfig = useMemo(() => {
        if (!stripeData.subscriptionBreakdown) return {} as ChartConfig;
        return {
            count: { label: 'Assinantes' },
            ...stripeData.subscriptionBreakdown.reduce((acc, cur, index) => {
                acc[cur.name] = { label: cur.name, color: `hsl(var(--chart-${(index % 5) + 1}))` };
                return acc;
            }, {} as Record<string, { label: string; color: string }>)
        } satisfies ChartConfig;
    }, [stripeData.subscriptionBreakdown]);
    
    const panels = useMemo(() => ({
        'realtime-users': { title: 'Usuários Ativos (Agora)', group: 'Analytics', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Usuários Ativos (Agora)</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{analyticsData?.realtime.activeUsers ?? 0}</div><p className="text-xs text-muted-foreground">Nos últimos 30 minutos</p></CardContent></Card> },
        'active-users-7d': { title: 'Usuários Ativos (7d)', group: 'Analytics', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Usuários Ativos (7d)</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{analyticsData?.mainMetrics.activeUsers ?? 0}</div> <p className="text-xs text-muted-foreground">Usuários únicos nos últimos 7 dias</p></CardContent></Card> },
        'new-users-7d': { title: 'Novos Usuários (7d)', group: 'Analytics', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Novos Usuários (7d)</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{analyticsData?.mainMetrics.newUsers ?? 0}</div><p className="text-xs text-muted-foreground">Usuários que visitaram pela primeira vez</p></CardContent></Card> },
        'conversions-7d': { title: 'Conversões (7d)', group: 'Analytics', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Conversões (7d)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{analyticsData?.mainMetrics.conversions ?? 0}</div><p className="text-xs text-muted-foreground">Testes iniciados, planos, etc.</p></CardContent></Card> },
        'mrr': { title: 'MRR (Stripe)', group: 'Stripe', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Receita Mensal Recorrente</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stripeData.mrr ?? 0)}</div><p className="text-xs text-muted-foreground">Previsão de receita mensal.</p></CardContent></Card> },
        'revenue-30d': { title: 'Receita (30d)', group: 'Stripe', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Receita (Últimos 30 dias)</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stripeData.revenueLast30Days ?? 0)}</div><p className="text-xs text-muted-foreground">Soma de cobranças bem-sucedidas.</p></CardContent></Card> },
        'active-subs': { title: 'Assinaturas Ativas', group: 'Stripe', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stripeData.activeSubscriptions ?? 0}</div><p className="text-xs text-muted-foreground">Total de clientes com assinaturas ativas.</p></CardContent></Card> },
        'arpu': { title: 'ARPU', group: 'Stripe', content: <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Receita Média / Usuário</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stripeData.avgRevenuePerUser ?? 0)}</div><p className="text-xs text-muted-foreground">MRR dividido por assinantes.</p></CardContent></Card> },
        
        'daily-views-chart': { title: 'Visualizações de Página (30d)', group: 'Analytics', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle className="flex items-center gap-2"><LineChart /> Visualizações de Página (30d)</CardTitle><CardDescription>Visualizações de página por dia.</CardDescription></CardHeader><CardContent className="flex-grow"><ChartContainer config={barChartConfig} className="h-full w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={analyticsData?.dailyViews}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} /><YAxis /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} /><Bar dataKey="views" fill="var(--color-views)" radius={4} /></BarChart></ResponsiveContainer></ChartContainer></CardContent></Card> },
        'conversion-funnel': { title: 'Funil de Conversão (7d)', group: 'Analytics', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown /> Funil de Conversão (7d)</CardTitle><CardDescription>Jornada do novo usuário até a contratação.</CardDescription></CardHeader><CardContent className="space-y-4 flex-grow">{funnel && (<><div className="space-y-2"><div className="flex items-center justify-between"><p className="font-medium">Novos Usuários</p><p className="font-bold">{funnel.newUsers}</p></div><Progress value={100} /></div><div className="space-y-2"><div className="flex items-center justify-between"><p className="font-medium">Testes Iniciados</p><p className="font-bold">{funnel.generatedLeads}</p></div><Progress value={leadConversionRate} /><p className="text-xs text-muted-foreground text-right">{leadConversionRate.toFixed(1)}% de conversão</p></div><div className="space-y-2"><div className="flex items-center justify-between"><p className="font-medium">Planos Contratados</p><p className="font-bold">{funnel.purchasedPlans}</p></div><Progress value={(purchaseConversionRate / 100) * leadConversionRate} /><p className="text-xs text-muted-foreground text-right">{purchaseConversionRate.toFixed(1)}% de conversão (dos que iniciaram teste)</p></div></>)}</CardContent></Card> },
        'event-count-chart': { title: 'Contagem de Eventos (7d)', group: 'Analytics', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 /> Contagem de Eventos</CardTitle><CardDescription>Eventos chave de conversão.</CardDescription></CardHeader><CardContent className="flex-grow"><ChartContainer config={barChartConfig} className="w-full h-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={analyticsData?.events.map(e => ({...e, name: eventTranslations[e.name] || e.name}))} layout="vertical"><CartesianGrid horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={4} /></BarChart></ResponsiveContainer></ChartContainer></CardContent></Card> },
        'top-pages': { title: 'Páginas Mais Acessadas (7d)', group: 'Analytics', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle className="flex items-center gap-2"><Eye /> Páginas Mais Acessadas</CardTitle><CardDescription>Top 5 páginas mais vistas.</CardDescription></CardHeader><CardContent className="flex-grow"><Table><TableHeader><TableRow><TableHead>Caminho da Página</TableHead><TableHead className="text-right">Visualizações</TableHead></TableRow></TableHeader><TableBody>{analyticsData?.pages.map(page => (<TableRow key={page.path}><TableCell className="font-mono text-xs truncate max-w-xs">{page.path}</TableCell><TableCell className="text-right font-medium">{page.views}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card> },
        'device-users': { title: 'Usuários por Dispositivo (7d)', group: 'Analytics', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle className="flex items-center gap-2"><PieChart /> Usuários por Dispositivo</CardTitle><CardDescription>Distribuição de usuários.</CardDescription></CardHeader><CardContent className="flex-grow">{analyticsData?.devices.map(device => (<div key={device.name} className="flex items-center justify-between p-2 rounded hover:bg-muted"><div className="flex items-center gap-2 text-sm">{deviceIconMap[device.name] || <Laptop className="h-4 w-4 text-muted-foreground" />}<span>{device.name}</span></div><span className="font-semibold">{device.users}</span></div>))}</CardContent></Card> },
        'daily-revenue-chart': { title: 'Faturamento Diário (30d)', group: 'Stripe', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle>Faturamento Diário (30d)</CardTitle></CardHeader><CardContent className="flex-grow"><ChartContainer config={barChartConfig} className="h-full w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={stripeData.dailyRevenue}><CartesianGrid vertical={false} /><XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} /><YAxis tickFormatter={(value) => formatCurrency(value as number)} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} /><Bar dataKey="total" fill="var(--color-total)" radius={4} /></BarChart></ResponsiveContainer></ChartContainer></CardContent></Card> },
        'recent-transactions': { title: 'Últimas Transações', group: 'Stripe', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle>Últimas Transações</CardTitle><CardDescription>As 5 cobranças mais recentes.</CardDescription></CardHeader><CardContent className="flex-grow"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{stripeData.recentCharges?.map(charge => (<TableRow key={charge.id}><TableCell><div className="font-medium truncate">{charge.customerEmail}</div><div className="text-xs text-muted-foreground">{format(new Date(charge.created * 1000), 'dd/MM/yyyy HH:mm')}</div></TableCell><TableCell className="text-right"><div className="flex justify-end items-center gap-2">{formatCurrency(charge.amount / 100)}{charge.receipt_url && (<a href={charge.receipt_url} target="_blank" rel="noopener noreferrer" title="Ver recibo no Stripe"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary"/></a>)}</div></TableCell></TableRow>))}</TableBody></Table></CardContent></Card> },
        'subs-by-plan-chart': { title: 'Assinantes por Plano', group: 'Stripe', content: <Card className="flex flex-col h-full"><CardHeader><CardTitle className="flex items-center gap-2"><PieChart /> Assinantes por Plano</CardTitle><CardDescription>Distribuição de assinantes.</CardDescription></CardHeader><CardContent className="flex-grow"><ChartContainer config={pieChartConfig} className="h-full w-full"><ResponsiveContainer width="100%" height="100%"><RechartsPieChart><Tooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="name" />} /><Pie data={stripeData.subscriptionBreakdown} dataKey="count" nameKey="name" innerRadius={60} strokeWidth={5} label>{stripeData.subscriptionBreakdown?.map((entry) => (<Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />))}</Pie></RechartsPieChart></ResponsiveContainer></ChartContainer></CardContent></Card> },
    }), [analyticsData, stripeData, pieChartConfig]);

    const panelGroups = {
        'Analytics': initialPanelOrder.filter(p => panels[p as keyof typeof panels]?.group === 'Analytics'),
        'Stripe': initialPanelOrder.filter(p => panels[p as keyof typeof panels]?.group === 'Stripe'),
    };
    
    if (loading) {
        return (
            <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Painel do Administrador</h1>
                    <Skeleton className="h-9 w-36" />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                 <div className="grid gap-6 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-96" />)}
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Falha ao Carregar o Painel</AlertTitle>
              <AlertDescription>
                <p>Ocorreram erros ao buscar dados de um ou mais serviços:</p>
                <p className='font-mono text-xs mt-2'>{error}</p>
              </AlertDescription>
            </Alert>
        )
    }

    return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Painel do Administrador</h1>
        <Button variant="outline" size="sm" onClick={() => setIsLayoutModalOpen(true)}>
            <Layout className="mr-2 h-4 w-4" /> Personalizar Layout
        </Button>
      </div>

       <Dialog open={isLayoutModalOpen} onOpenChange={setIsLayoutModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Personalizar Painel</DialogTitle>
                    <DialogDescription>Selecione os painéis que deseja exibir.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {Object.entries(panelGroups).map(([groupName, panelIds]) => (
                        <div key={groupName}>
                            <h3 className="mb-2 font-semibold text-lg">{groupName}</h3>
                            <div className="space-y-2">
                                {panelIds.map(panelId => {
                                    const panel = (panels as any)[panelId];
                                    if (!panel) return null;
                                    return (
                                        <div key={panelId} className="flex items-center justify-between rounded-lg border p-3">
                                            <Label htmlFor={`switch-${panelId}`} className="font-normal">{panel.title}</Label>
                                            <Switch id={`switch-${panelId}`} checked={visiblePanels[panelId]} onCheckedChange={() => handleToggleVisibility(panelId)} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            {initialPanelOrder.map(panelId => {
                const panel = (panels as any)[panelId];
                if (!panel || !visiblePanels[panelId]) return null;
                
                const isSmall = smallPanelIds.includes(panelId);
                const panelClassName = cn(
                    "flex flex-col",
                    isSmall ? "lg:col-span-3" : "lg:col-span-4",
                );

                return (
                    <div key={panelId} className={panelClassName}>
                       {loading ? <Skeleton className="h-full w-full" /> : panel.content}
                    </div>
                );
            })}
        </div>
    </div>
  );
}
