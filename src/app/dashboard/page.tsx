'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-4">
       <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao ServiceWise, {user?.email}!</CardTitle>
          <CardDescription>Este é o seu painel central de gerenciamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Selecione uma das opções no menu ao lado para começar a gerenciar suas operações.</p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ordens de Serviço Ativas</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 do que no mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">152</div>
            <p className="text-xs text-muted-foreground">+15.3% de crescimento</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
