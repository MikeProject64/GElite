'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ServiceOrder } from '@/types';
import { useMemo } from 'react';
import { useSettings } from '@/components/settings-provider';

interface ServiceTypeChartProps {
  orders: ServiceOrder[];
}

const processDataForChart = (orders: ServiceOrder[], serviceTypes: { id: string; name: string; color?: string }[] = []) => {
    const typeCounts: { [key: string]: number } = {};

    orders.forEach(order => {
        if (order.serviceType) {
            typeCounts[order.serviceType] = (typeCounts[order.serviceType] || 0) + 1;
        }
    });

    const typeColorMap = new Map(serviceTypes.map(st => [st.name, st.color]));
    
    // Default colors for variety
    const defaultColors = [
        'hsl(210, 70%, 60%)', 'hsl(142, 69%, 51%)', 'hsl(48, 96%, 58%)',
        'hsl(262, 80%, 70%)', 'hsl(340, 82%, 58%)', 'hsl(24, 90%, 55%)'
    ];

    return Object.entries(typeCounts)
        .map(([name, value], index) => ({
            name,
            value,
            fill: typeColorMap.get(name) ? `hsl(${typeColorMap.get(name)})` : defaultColors[index % defaultColors.length]
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);
};

export function ServiceTypeChart({ orders }: ServiceTypeChartProps) {
  const { settings } = useSettings();
  const chartData = useMemo(() => processDataForChart(orders, settings?.serviceTypes), [orders, settings?.serviceTypes]);

  if (chartData.length === 0) {
      return <div className="text-center text-muted-foreground mt-4">Nenhum tipo de serviço para exibir.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Tooltip
                formatter={(value) => [`${value} ordens`, 'Quantidade']}
            />
            <Legend />
            <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
            >
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
            </Pie>
        </PieChart>
    </ResponsiveContainer>
  );
}

    