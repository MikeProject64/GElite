'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ServiceOrder, ServiceStatus } from '@/types';
import { useMemo } from 'react';

interface OrderStatusChartProps {
  orders: ServiceOrder[];
  statuses: ServiceStatus[];
}

const processDataForChart = (orders: ServiceOrder[], statuses: ServiceStatus[]) => {
    const statusCounts: { [key: string]: number } = {};

    statuses.forEach(status => {
        statusCounts[status.name] = 0;
    });

    orders.forEach(order => {
        if (order.status && statusCounts.hasOwnProperty(order.status)) {
            statusCounts[order.status]++;
        }
    });

    return statuses.map(status => ({
        name: status.name,
        value: statusCounts[status.name],
        fill: `hsl(${status.color})`,
    })).filter(item => item.value > 0);
};

export function OrderStatusChart({ orders, statuses }: OrderStatusChartProps) {
  const chartData = useMemo(() => processDataForChart(orders, statuses), [orders, statuses]);

  if (chartData.length === 0) {
      return <div className="text-center text-muted-foreground mt-4">Nenhuma ordem de serviço para exibir.</div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Tooltip
                formatter={(value) => [`${value} ordens`, 'Status']}
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
