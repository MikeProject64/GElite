
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { getStripeDashboardData, StripeDashboardData } from './actions';
import { DollarSign, TrendingUp, Users, Wallet, AlertTriangle, ExternalLink } from 'lucide-react';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const chartConfig = {
  total: {
    label: 'Faturamento',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function StripeDashboardPage() {
  const [data, setData] = useState<Omit<StripeDashboardData, 'success' | 'message'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getStripeDashboardData();
        if (result.success) {
          setData(result);
        } else {
          setError(result.message || 'Ocorreu um erro desconhecido.');
          toast({ variant: 'destructive', title: 'Erro ao buscar dados do Stripe', description: result.message });
        }
      } catch (e: any) {
        setError(e.message);
        toast({ variant: 'destructive', title: 'Erro de Conexão', description: 'Não foi possível conectar à API do Stripe.' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Painel do Stripe</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  
  if (error) {
     return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Painel do Stripe</h1>
            <Card className="bg-destructive/10 border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle /> Falha ao Carregar</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                    <p className="mt-2 text-sm text-destructive/80">Verifique se suas chaves de API do Stripe estão configuradas corretamente na aba de Integrações.</p>
                </CardContent>
            </Card>
        </div>
     )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Painel do Stripe</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal Recorrente (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.mrr ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Previsão de receita mensal das assinaturas ativas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Últimos 30 dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.revenueLast30Days ?? 0)}</div>
            <p className="text-xs text-muted-foreground">Soma de todas as cobranças bem-sucedidas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSubscriptions ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total de clientes com assinaturas ativas.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento Diário (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.dailyRevenue}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                  />
                  <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
            <CardDescription>As 5 cobranças mais recentes bem-sucedidas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.recentCharges?.map(charge => (
                        <TableRow key={charge.id}>
                            <TableCell>
                                <div className="font-medium truncate">{charge.customerEmail}</div>
                                <div className="text-xs text-muted-foreground">{format(new Date(charge.created * 1000), 'dd/MM/yyyy HH:mm')}</div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2">
                                     {formatCurrency(charge.amount / 100)}
                                    {charge.receipt_url && (
                                        <a href={charge.receipt_url} target="_blank" rel="noopener noreferrer" title="Ver recibo no Stripe">
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary"/>
                                        </a>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
