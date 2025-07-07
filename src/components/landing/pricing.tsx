
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';
import { Skeleton } from '../ui/skeleton';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ScrollReveal } from './scroll-reveal';

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
  const [interval, setInterval] = useState<'month' | 'year'>('year');

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
      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6 lg:px-24 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
              Preços Simples e Transparentes
            </h2>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
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
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Preços Simples e Transparentes
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Escolha o plano certo para o seu negócio.
          </p>
        </ScrollReveal>
        
        <ScrollReveal delay={100} className="flex justify-center items-center gap-4 mb-12 font-body">
            <Label htmlFor="interval-switch" className={interval === 'month' ? 'text-primary font-bold' : 'text-muted-foreground'}>
                Cobrança Mensal
            </Label>
            <Switch
                id="interval-switch"
                checked={interval === 'year'}
                onCheckedChange={(checked) => setInterval(checked ? 'year' : 'month')}
                aria-label="Alternar entre cobrança mensal e anual"
            />
            <Label htmlFor="interval-switch" className={interval === 'year' ? 'text-primary font-bold' : 'text-muted-foreground'}>
                Cobrança Anual
            </Label>
        </ScrollReveal>

        {/* Mobile Carousel View */}
        <div className="md:hidden">
            <Carousel opts={{ align: "start" }} className="w-full max-w-md mx-auto">
              <CarouselContent className="-ml-2">
                {plans.map((plan, index) => {
                  const price = interval === 'year' && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.monthlyPrice;
                  const priceDescription = interval === 'year' && plan.yearlyPrice > 0 ? '/ano' : '/mês';
                  const savings = plan.yearlyPrice > 0 ? (plan.monthlyPrice * 12) - plan.yearlyPrice : 0;
                  
                  return (
                    <CarouselItem key={plan.id} className="basis-11/12 pl-2">
                      <ScrollReveal className="p-1 h-full flex" delay={index * 100}>
                        <Card className={cn('relative flex flex-col h-full shadow-sm w-full', index === 1 && 'border-primary')}>
                          {index === 1 && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>}
                          <CardHeader className="text-center">
                              <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                              <CardDescription className="font-body">{plan.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow flex flex-col">
                              <div className="text-center mb-6">
                              <span className="text-4xl font-bold font-headline">{formatCurrency(price)}</span>
                              <span className="text-muted-foreground font-body">{priceDescription}</span>
                              {interval === 'year' && plan.yearlyPrice > 0 && (
                                <div className='mt-2'>
                                  <p className="text-sm text-muted-foreground">Equivalente a {formatCurrency(plan.yearlyPrice / 12)}/mês</p>
                                  {savings > 0 && <Badge variant="secondary" className="mt-1 text-green-600 border-green-600">Economize {formatCurrency(savings)}!</Badge>}
                                </div>
                              )}
                              </div>
                              <ul className="space-y-4 font-body flex-grow">
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
                              <Link href={`/signup?planId=${plan.id}&interval=${interval}`}>Contratar Plano</Link>
                              </Button>
                          </CardFooter>
                        </Card>
                      </ScrollReveal>
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
            </Carousel>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => {
            const price = interval === 'year' && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.monthlyPrice;
            const priceDescription = interval === 'year' && plan.yearlyPrice > 0 ? '/ano' : '/mês';
            const savings = plan.yearlyPrice > 0 ? (plan.monthlyPrice * 12) - plan.yearlyPrice : 0;
            
            return (
              <ScrollReveal key={plan.id} delay={index * 100} className="h-full">
                <Card key={plan.id} className={cn('relative flex flex-col h-full shadow-sm', index === 1 && 'border-primary ring-2 ring-primary shadow-lg')}>
                {index === 1 && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais Popular</Badge>}
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="font-body">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                    <div className="text-center mb-6">
                    <span className="text-4xl font-bold font-headline">{formatCurrency(price)}</span>
                    <span className="text-muted-foreground font-body">{priceDescription}</span>
                    {interval === 'year' && plan.yearlyPrice > 0 && (
                      <div className='mt-2'>
                        <p className="text-sm text-muted-foreground">Equivalente a {formatCurrency(plan.yearlyPrice / 12)}/mês</p>
                        {savings > 0 && <Badge variant="secondary" className="mt-1 text-green-600 border-green-600">Economize {formatCurrency(savings)}!</Badge>}
                      </div>
                    )}
                    </div>
                    <ul className="space-y-4 font-body flex-grow">
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
                    <Link href={`/signup?planId=${plan.id}&interval=${interval}`}>Contratar Plano</Link>
                    </Button>
                </CardFooter>
                </Card>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  );
}
