
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Plan } from '@/types';
import { Skeleton } from '../ui/skeleton';
import { useSearchParams } from 'next/navigation';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function Pricing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email');

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
        <div className="container px-4 md:px-6 mx-auto">
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
               <Card key={i} className="flex flex-col h-full p-6">
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
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Preços Simples e Transparentes
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Escolha o plano certo para o seu negócio.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => {
            const monthlyLink = `/signup?planId=${plan.id}&interval=month${emailFromUrl ? `&email=${encodeURIComponent(emailFromUrl)}` : ''}`;
            const yearlyLink = `/signup?planId=${plan.id}&interval=year${emailFromUrl ? `&email=${encodeURIComponent(emailFromUrl)}` : ''}`;

            return (
                <Card key={plan.id} className={`flex flex-col h-full`}>
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="font-body">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                    <div className="text-center mb-6">
                    <span className="text-4xl font-bold font-headline">{formatCurrency(plan.monthlyPrice)}</span>
                    <span className="text-muted-foreground font-body">/mês</span>
                    {plan.yearlyPrice > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">ou {formatCurrency(plan.yearlyPrice)}/ano</p>
                        )}
                    </div>
                    <ul className="space-y-4 font-body flex-grow">
                    {Object.entries(plan.features).map(([feature, enabled]) => (
                        enabled &&
                        <li key={feature} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className='capitalize'>{feature}</span>
                        </li>
                    ))}
                    </ul>
                </CardContent>
                <CardFooter className='flex-col gap-2'>
                    <Button asChild className={`w-full`}>
                    <Link href={monthlyLink}>Contratar Plano Mensal</Link>
                    </Button>
                    {plan.yearlyPrice > 0 && (
                    <Button asChild variant="outline" className={`w-full`}>
                        <Link href={yearlyLink}>Contratar Plano Anual</Link>
                    </Button>
                    )}
                </CardFooter>
                </Card>
            )
          })}
        </div>
      </div>
    </section>
  );
}
