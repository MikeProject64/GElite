
'use client';

import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

interface MonthlyRevenueChartProps {
  data: { month: string; total: number }[];
  period: '30d' | 'this_month' | '6m';
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};

export function MonthlyRevenueChart({ data, period }: MonthlyRevenueChartProps) {
  const chartConfig = {
    total: {
      label: 'Faturamento',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;
  
  const yAxisFormatter = (value: number) => {
    if (period === '6m') {
        return `R$${value / 1000}k`;
    }
    return formatCurrency(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'><TrendingUp /> Faturamento</CardTitle>
        <CardDescription>Receita de ordens de serviço concluídas no período.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis tickFormatter={yAxisFormatter} width={80} />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent
                formatter={(value) => formatCurrency(value as number)}
                indicator='dot'
              />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
