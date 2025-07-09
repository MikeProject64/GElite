
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getAnalyticsReport } from './actions';
import { Users, Eye, Repeat, AlertTriangle, TrendingUp } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

interface AnalyticsData {
  activeUsers?: number;
  pageViews?: number;
  newUsers?: number;
  conversions?: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const result = await getAnalyticsReport();
      if (result.success) {
        setData(result.data || {});
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
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
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
              Para habilitar esta página, por favor, siga estes passos:
              <ul className="list-decimal list-inside mt-1 text-xs">
                <li>Certifique-se de que a API do Google Analytics Data (v1beta) está ativada no seu projeto Google Cloud.</li>
                <li>Crie uma conta de serviço no Google Cloud e conceda a ela a permissão de "Leitor" na sua propriedade do Google Analytics.</li>
                <li>Faça o download do arquivo de chave JSON da conta de serviço.</li>
                <li>Defina a variável de ambiente `GOOGLE_APPLICATION_CREDENTIALS` no seu servidor para o caminho do arquivo JSON.</li>
                 <li>Defina a variável de ambiente `GA4_PROPERTY_ID` com o ID da sua propriedade do Google Analytics 4.</li>
              </ul>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics (Últimos 7 dias)</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeUsers ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.newUsers ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visualizações de Página</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pageViews ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.conversions ?? 0}</div>
            <p className="text-xs text-muted-foreground">Novas assinaturas, testes, etc.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
