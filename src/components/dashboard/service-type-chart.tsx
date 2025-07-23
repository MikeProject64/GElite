'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ServiceOrder } from '@/types';
import { useMemo } from 'react';
import { useSettings } from '@/components/settings-provider';

interface ServiceTypeChartProps {
  orders: ServiceOrder[];
}

const processDataForChart = (orders: ServiceOrder[], serviceTypes: { id: string; name: string; color?: string }[] = []) => {
    // Se não há tipos de serviço definidos, não há o que mostrar.
    if (!serviceTypes || serviceTypes.length === 0) {
        return [];
    }
    
    const typeCounts: { [key: string]: number } = {};
    // Inicializa a contagem para todos os tipos de serviço definidos.
    serviceTypes.forEach(st => {
        typeCounts[st.name] = 0;
    });

    // Conta as ordens para cada tipo de serviço definido.
    orders.forEach(order => {
        if (order.serviceType && typeCounts.hasOwnProperty(order.serviceType)) {
            typeCounts[order.serviceType]++;
        }
    });

    const typeColorMap = new Map(serviceTypes.map(st => [st.name, st.color]));
    
    const defaultColors = [
        'hsl(210, 70%, 60%)', 'hsl(142, 69%, 51%)', 'hsl(48, 96%, 58%)',
        'hsl(262, 80%, 70%)', 'hsl(340, 82%, 58%)', 'hsl(24, 90%, 55%)'
    ];

    // Mapeia os dados para o formato do gráfico, usando a lista de tipos como base.
    return serviceTypes
        .map((st, index) => ({
            name: st.name,
            value: typeCounts[st.name] || 0,
            fill: st.color ? `hsl(${st.color})` : defaultColors[index % defaultColors.length]
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

    