
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getAnalyticsReports } from './actions';
import { Users, Eye, Repeat, AlertTriangle, TrendingUp, Laptop, Smartphone, Tablet, BarChart2, PieChart, MapPin, TrendingDown, LineChart } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Pie } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface AnalyticsData {
  realtime: { activeUsers: number };
  mainMetrics: { activeUsers: number; newUsers: number; conversions: number };
  events: { name: string; count: number }[];
  pages: { path: string; views: number }[];
  devices: { name: string; users: number }[];
  conversionFunnel: { newUsers: number; generatedLeads: number; purchasedPlans: number };
  dailyViews: { date: string; views: number }[];
}

const eventTranslations: { [key: string]: string } = {
  'generate_lead': 'Teste Iniciado',
  'plano_contratado': 'Plano Contratado',
  'begin_checkout': 'Iniciou Checkout'
};

const chartConfig = {
  count: { label: "Contagem", color: "hsl(var(--chart-1))" },
  views: { label: "Visualizações", color: "hsl(var(--chart-2))" },
  users: { label: "Usuários", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const result = await getAnalyticsReports();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message || 'Ocorreu um erro desconhecido.');
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
         <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao Conectar ao Google Analytics</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <p className="mt-2">
              Para habilitar esta página, por favor, vá para a seção de{' '}
              <Link href="/admin/integrations" className="font-bold underline hover:no-underline">Integrações</Link>
              {' '}e configure o ID da Propriedade do GA4 e o arquivo de credenciais JSON.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
                Dica: Certifique-se de que a API do Google Analytics Data (v1beta) está ativada no seu projeto Google Cloud e que a conta de serviço tem permissão de "Leitor".
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const deviceIconMap: { [key: string]: React.ReactNode } = {
    'Desktop': <Laptop className="h-4 w-4 text-muted-foreground" />,
    'Mobile': <Smartphone className="h-4 w-4 text-muted-foreground" />,
    'Tablet': <Tablet className="h-4 w-4 text-muted-foreground" />,
  };
  
  const funnel = data?.conversionFunnel;
  const leadConversionRate = funnel && funnel.newUsers > 0 ? (funnel.generatedLeads / funnel.newUsers) * 100 : 0;
  const purchaseConversionRate = funnel && funnel.generatedLeads > 0 ? (funnel.purchasedPlans / funnel.generatedLeads) * 100 : 0;
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos (Agora)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.realtime.activeUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">Nos últimos 30 minutos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos (7d)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.mainMetrics.activeUsers ?? 0}</div>
             <p className="text-xs text-muted-foreground">Usuários únicos nos últimos 7 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Usuários (7d)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.mainMetrics.newUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">Usuários que visitaram pela primeira vez</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões (7d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.mainMetrics.conversions ?? 0}</div>
            <p className="text-xs text-muted-foreground">Testes iniciados, planos, etc.</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LineChart /> Visualizações de Página (Últimos 30 dias)</CardTitle>
          <CardDescription>Visualizações de página por dia para todo o site.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.dailyViews}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                  <Bar dataKey="views" fill="var(--color-views)" radius={4} maxBarSize={80} />
                </BarChart>
              </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
       </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart2 /> Contagem de Eventos</CardTitle>
            <CardDescription>Eventos chave de conversão nos últimos 7 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.events.map(e => ({...e, name: eventTranslations[e.name] || e.name}))} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><TrendingDown /> Funil de Conversão (7d)</CardTitle>
             <CardDescription>Jornada do novo usuário até a contratação de um plano.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
              {funnel && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <p className="font-medium">Novos Usuários</p>
                       <p className="font-bold">{funnel.newUsers}</p>
                    </div>
                    <Progress value={100} />
                  </div>
                   <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <p className="font-medium">Testes Iniciados (generate_lead)</p>
                       <p className="font-bold">{funnel.generatedLeads}</p>
                    </div>
                    <Progress value={leadConversionRate} />
                    <p className="text-xs text-muted-foreground text-right">{leadConversionRate.toFixed(1)}% de conversão</p>
                  </div>
                   <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <p className="font-medium">Planos Contratados</p>
                       <p className="font-bold">{funnel.purchasedPlans}</p>
                    </div>
                    <Progress value={(purchaseConversionRate / 100) * leadConversionRate} />
                     <p className="text-xs text-muted-foreground text-right">{purchaseConversionRate.toFixed(1)}% de conversão (dos que iniciaram teste)</p>
                  </div>
                </>
              )}
           </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye /> Páginas Mais Acessadas</CardTitle>
              <CardDescription>Top 5 páginas mais vistas nos últimos 7 dias.</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caminho da Página</TableHead>
                    <TableHead className="text-right">Visualizações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.pages.map(page => (
                    <TableRow key={page.path}>
                      <TableCell className="font-mono text-xs truncate max-w-xs">{page.path}</TableCell>
                      <TableCell className="text-right font-medium">{page.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChart /> Usuários por Dispositivo</CardTitle>
              <CardDescription>Distribuição de usuários nos últimos 7 dias.</CardDescription>
            </CardHeader>
            <CardContent>
                {data?.devices.map(device => (
                    <div key={device.name} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <div className="flex items-center gap-2 text-sm">
                        {deviceIconMap[device.name] || <Laptop className="h-4 w-4 text-muted-foreground" />}
                        <span>{device.name}</span>
                      </div>
                      <span className="font-semibold">{device.users}</span>
                    </div>
                ))}
            </CardContent>
          </Card>
       </div>
    </div>
  );
}
