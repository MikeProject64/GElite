'use client';

import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from './scroll-reveal';
import { Card } from '../ui/card';

export function FreeTrial() {
  return (
    <section id="free-trial" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal>
          <Card className="bg-muted/50 border-primary border-2 shadow-lg">
            <div className="grid md:grid-cols-2 items-center gap-6">
              <div className="p-8 md:p-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline text-primary">
                  Experimente Todas as Funcionalidades
                </h2>
                <p className="max-w-[600px] text-muted-foreground md:text-lg mt-4 font-body">
                  Teste o Gestor Elite com acesso total, **grátis por 7 dias**. Sem compromisso e sem necessidade de cartão de crédito. Comece a otimizar sua gestão agora mesmo.
                </p>
                <div className="mt-6">
                  <Button size="lg" asChild>
                    <Link href="/signup?trial=true">
                        <Rocket className="mr-2 h-5 w-5" />
                        Iniciar Teste Gratuito
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="hidden md:flex justify-center items-center p-8">
                 <Rocket className="w-32 h-32 text-primary/20" />
              </div>
            </div>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}
