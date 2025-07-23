
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ServiceOrder } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';

interface MonthlyRevenueChartProps {
  orders: ServiceOrder[];
}

const processDataForChart = (orders: ServiceOrder[]) => {
    const monthlyData: { [key: string]: { name: string; Receita: number } } = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    // Initialize last 12 months
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const key = `${year}-${month}`;
        monthlyData[key] = {
            name: `${monthNames[month]}/${String(year).slice(-2)}`,
            Receita: 0,
        };
    }
    
    orders.forEach(order => {
        if (order.conclusionDate && order.totalValue) {
            const conclusionDate = (order.conclusionDate as Timestamp).toDate();
            const year = conclusionDate.getFullYear();
            const month = conclusionDate.getMonth();
            const key = `${year}-${month}`;

            if (key in monthlyData) {
                monthlyData[key].Receita += order.totalValue;
            }
        }
    });

    return Object.values(monthlyData);
};

export function MonthlyRevenueChart({ orders }: MonthlyRevenueChartProps) {
  const chartData = useMemo(() => processDataForChart(orders), [orders]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis 
            tickFormatter={(value) =>
                new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                }).format(value as number)
            }
        />
        <Tooltip
            formatter={(value) => 
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)
            } 
        />
        <Legend />
        <Bar dataKey="Receita" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
