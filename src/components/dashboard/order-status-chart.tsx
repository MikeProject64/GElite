'use client';

import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Wrench } from 'lucide-react';

interface OrderStatusChartProps {
  data: {
    status: string;
    count: number;
    fill: string;
  }[];
}

const chartConfig = {
  count: {
    label: 'Ordens de Serviço',
  },
} satisfies ChartConfig;

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wrench /> Ordens por Status</CardTitle>
        <CardDescription>Distribuição de todas as ordens de serviço cadastradas.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <Tooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="status" />} />
            <Pie data={data} dataKey="count" nameKey="status" innerRadius={60} strokeWidth={5} label>
              {data.map((entry) => (
                <Cell key={`cell-${entry.status}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
