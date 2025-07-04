
'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Users, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeOrders: 0, totalCustomers: 0 });

  useEffect(() => {
    if (!user) return;

    const activeStatuses = ['Pendente', 'Em Andamento', 'Aguardando Peça'];
    
    // Listener for service orders
    const ordersQuery = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const activeCount = snapshot.docs.filter(doc => activeStatuses.includes(doc.data().status)).length;
      setStats(prevStats => ({...prevStats, activeOrders: activeCount}));
      setLoading(false);
    }, () => setLoading(false));

    // Listener for customers
    const customersQuery = query(collection(db, 'customers'), where('userId', '==', user.uid));
    const unsubscribeCustomers = onSnapshot(customersQuery, (snapshot) => {
        const customerCount = snapshot.size;
        setStats(prevStats => ({...prevStats, totalCustomers: customerCount}));
    });
    
    return () => {
      unsubscribeOrders();
      unsubscribeCustomers();
    };

  }, [user]);

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
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.activeOrders}</div>}
            <p className="text-xs text-muted-foreground">Ordens pendentes ou em andamento.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{stats.totalCustomers}</div>}
            <p className="text-xs text-muted-foreground">Total de clientes em sua base.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
