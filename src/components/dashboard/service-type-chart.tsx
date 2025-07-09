'use client';

import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { SlidersHorizontal } from 'lucide-react';
import React from 'react';

interface ServiceTypeChartProps {
  data: {
    type: string;
    count: number;
    fill: string;
  }[];
}

export function ServiceTypeChart({ data }: ServiceTypeChartProps) {
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      count: { label: 'Ordens de Serviço' },
    };
    if (data) {
        data.forEach(item => {
        config[item.type] = {
            label: item.type,
            color: item.fill,
        };
        });
    }
    return config;
  }, [data]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><SlidersHorizontal /> Serviços por Tipo</CardTitle>
        <CardDescription>Distribuição dos tipos de serviço mais comuns.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="type" />}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              innerRadius={60}
              strokeWidth={5}
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.type}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="type" />}
              className="-mt-4"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

    