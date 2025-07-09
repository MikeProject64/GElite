
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, CreditCard, Package, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { SystemUser, Plan } from '@/types';
import { getActiveSubscriptionCount } from './actions';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalUsers: 0, activeSubscriptions: 0, totalPlans: 0 });
  const [recentUsers, setRecentUsers] = useState<SystemUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Firestore listeners
    const usersQuery = query(collection(db, 'users'));
    const plansQuery = query(collection(db, 'plans'));
    const recentUsersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    });

    const unsubPlans = onSnapshot(plansQuery, (snapshot) => {
      const planData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
      setPlans(planData);
      setStats(prev => ({ ...prev, totalPlans: snapshot.size }));
    });

    const unsubRecentUsers = onSnapshot(recentUsersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as SystemUser));
      setRecentUsers(usersData);
    });

    // Stripe API call
    const fetchStripeData = async () => {
        try {
            const result = await getActiveSubscriptionCount();
            if (result.success) {
                setStats(prev => ({ ...prev, activeSubscriptions: result.count ?? 0 }));
            } else {
                console.error("Failed to fetch Stripe active subs:", result.message);
                toast({
                    variant: 'destructive',
                    title: 'Erro de API do Stripe',
                    description: result.message || 'Não foi possível carregar as assinaturas ativas.',
                });
            }
        } catch (error) {
            console.error("Error calling getActiveSubscriptionCount:", error);
        }
    };

    const initialLoad = async () => {
        setLoading(true);
        try {
            await Promise.all([
                getDocs(usersQuery),
                getDocs(plansQuery),
                getDocs(recentUsersQuery),
                fetchStripeData()
            ]);
        } catch (error) {
            console.error("Error during initial data fetch:", error);
        } finally {
            setLoading(false);
        }
    };

    initialLoad();

    return () => {
      unsubUsers();
      unsubPlans();
      unsubRecentUsers();
    };
  }, [toast]);

  const getPlanName = (planId?: string) => {
    if (!planId) return 'N/A';
    const plan = plans.find(p => p.id === planId);
    return plan?.name || 'Não encontrado';
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Painel do Administrador</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo, Administrador!</CardTitle>
          <CardDescription>Esta é a sua área central de gerenciamento. Use o menu à esquerda para navegar pelas funcionalidades.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Acompanhe em tempo real o crescimento e as atividades da sua plataforma.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats.totalUsers}</div>}
              <p className="text-xs text-muted-foreground">Usuários cadastrados na plataforma.</p>
            </CardContent>
          </Card>
        </Link>
        <a href="https://dashboard.stripe.com/subscriptions" target="_blank" rel="noopener noreferrer">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas Ativas (Stripe)</CardTitle>
              <div className="flex items-center gap-1 text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                <CreditCard className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>}
              <p className="text-xs text-muted-foreground">Contagem real de assinaturas no Stripe.</p>
            </CardContent>
          </Card>
        </a>
        <Link href="/admin/plans">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos Criados</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats.totalPlans}</div>}
              <p className="text-xs text-muted-foreground">Total de planos disponíveis para assinatura.</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="hidden sm:table-cell">Plano</TableHead>
                  <TableHead className="text-right">Data de Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsers.map(user => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium truncate">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{user.subscriptionStatus === 'trialing' ? 'Em Teste' : getPlanName(user.planId)}</TableCell>
                    <TableCell className="text-right">{user.createdAt ? format(user.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
