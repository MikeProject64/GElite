
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';
import { Skeleton } from '../ui/skeleton';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const featureMap: Record<string, string> = {
  servicos: 'Gestão de Serviços',
  orcamentos: 'Criação de Orçamentos',
  prazos: 'Controle de Prazos',
  atividades: 'Histórico de Atividades',
  clientes: 'Base de Clientes (CRM)',
  colaboradores: 'Equipes e Colaboradores',
  inventario: 'Controle de Inventário',
};


export function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'plans'), where('isPublic', '==', true), orderBy('monthlyPrice', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
      setPlans(fetchedPlans);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching public plans: ", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-card">
        <div className="container px-4 md:px-6 lg:px-8 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Preços Simples e Transparentes
            </h2>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2">
              Escolha o plano certo para o seu negócio.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
             {[...Array(3)].map((_, i) => (
               <Card key={i} className="flex flex-col h-full p-6 shadow-sm">
                  <Skeleton className="h-6 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-6" />
                  <Skeleton className="h-10 w-1/3 mb-6" />
                  <div className="space-y-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                  </div>
                  <Skeleton className="h-12 w-full mt-auto" />
               </Card>
             ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 lg:px-8 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Preços Simples e Transparentes
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2">
            Escolha o plano certo para o seu negócio.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <Card key={plan.id} className={`flex flex-col h-full shadow-sm ${index === 1 ? 'border-primary' : ''}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{formatCurrency(plan.monthlyPrice)}</span>
                  <span className="text-muted-foreground">/mês</span>
                   {plan.yearlyPrice > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">ou {formatCurrency(plan.yearlyPrice)}/ano</p>
                    )}
                </div>
                <ul className="space-y-4 flex-grow">
                  {plan.features && Object.entries(plan.features).map(([featureKey, enabled]) => (
                    enabled &&
                    <li key={featureKey} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>{featureMap[featureKey] || featureKey}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className='flex-col gap-2'>
                <Button asChild className={`w-full`}>
                  <Link href={`/signup?planId=${plan.id}&interval=month`}>Contratar Plano Mensal</Link>
                </Button>
                 {plan.yearlyPrice > 0 && (
                  <Button asChild variant="outline" className={`w-full`}>
                    <Link href={`/signup?planId=${plan.id}&interval=year`}>Contratar Plano Anual</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
