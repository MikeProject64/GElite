
'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import type { UserSettings } from '@/types';
import NetworkAnimation from './network-animation';
import { ScrollReveal } from './scroll-reveal';
import * as gtag from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface HeroProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

export function Hero({ landingPageImages }: HeroProps) {
  const heroImage = landingPageImages?.heroImage || "https://placehold.co/600x550.png";

  const handleCTAClick = (ctaName: string) => {
    gtag.event({
      action: 'cta_click',
      params: { cta_name: ctaName },
    });
  };

  return (
    <section className="w-full py-20 md:py-32 lg:py-40 relative overflow-hidden">
      <NetworkAnimation />
      <div className="container px-4 md:px-6 lg:px-24 mx-auto relative z-10">
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-x-16 items-center">
          <ScrollReveal className="flex flex-col justify-center space-y-6 lg:col-span-2">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary font-body">
                GESTÃO DE SERVIÇOS SIMPLIFICADA
              </p>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                A plataforma completa para gestão de serviços
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl font-body">
                Centralize ordens de serviço, clientes e inventário em um só lugar.
              </p>
            </div>
            <div className="w-full max-w-md space-y-2">
                <Input type="email" placeholder="Digite seu e-mail aqui!." className="h-12 text-base" />
                <Button size="lg" className="w-full text-base">
                  Fazer cadastro
                </Button>
              </div>
          </ScrollReveal>
          <ScrollReveal delay={200} className="flex justify-center lg:col-span-3">
            <Image
              src={heroImage}
              alt="Ilustração de pessoas analisando gráficos"
              width={1200}
              height={900}
              className="mx-auto aspect-[12/9] overflow-hidden rounded-xl object-contain"
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
