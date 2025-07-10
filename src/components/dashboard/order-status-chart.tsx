'use client';

import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Wrench } from 'lucide-react';
import React from 'react';

interface OrderStatusChartProps {
  data: {
    status: string;
    count: number;
    fill: string;
  }[];
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      count: { label: 'Ordens de Serviço' },
    };
    if (data) {
        data.forEach(item => {
        config[item.status] = {
            label: item.status,
            color: item.fill,
        };
        });
    }
    return config;
  }, [data]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Wrench /> Ordens por Status</CardTitle>
        <CardDescription>Distribuição das ordens de serviço no período selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="status" />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.status}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="status" />}
              className="-mt-4"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
