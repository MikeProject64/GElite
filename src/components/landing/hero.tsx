
'use client';

import Image from 'next/image';
import type { UserSettings } from '@/types';
import NetworkAnimation from './network-animation';
import { ScrollReveal } from './scroll-reveal';
import { QuickTrialForm } from './quick-trial';

interface HeroProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

export function Hero({ landingPageImages }: HeroProps) {
  const heroImage = landingPageImages?.heroImage || "https://placehold.co/600x550.png";

  return (
    <section className="w-full py-20 md:py-24 lg:py-32 relative overflow-hidden">
      <NetworkAnimation />
      <div className="container px-4 md:px-6 lg:px-24 mx-auto relative z-10">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-x-16 items-center">
          <ScrollReveal className="flex flex-col justify-center space-y-6 lg:col-span-2">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary font-body">
                GESTÃO DE SERVIÇOS SIMPLIFICADA
              </p>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                Teste grátis por 7 dias.
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl font-body">
                Acesso completo por 7 dias. Sem necessidade de cartão de crédito.
              </p>
            </div>
            <QuickTrialForm />
          </ScrollReveal>
          <ScrollReveal delay={200} className="flex flex-col justify-center items-center lg:col-span-3">
            <Image
              src={heroImage}
              alt="Ilustração de pessoas analisando gráficos"
              width={1200}
              height={900}
              className="mx-auto aspect-[12/9] overflow-hidden rounded-xl object-contain shadow-2xl"
              data-ai-hint="data analytics"
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
