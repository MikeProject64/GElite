
'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { useSettings } from '@/components/settings-provider';
import type { UserSettings } from '@/types';

interface HeroProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

export function Hero({ landingPageImages }: HeroProps) {
  const { settings } = useSettings();
  const heroImage = landingPageImages?.heroImage || settings.landingPageImages?.heroImage || "https://placehold.co/600x550.png";

  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-card">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-16 items-center">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary font-body">
                GESTÃO DE SERVIÇOS SIMPLIFICADA
              </p>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                A plataforma completa para gestão de serviços
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl font-body">
                Centralize ordens de serviço, clientes e inventário em um só lugar. Aumente a eficiência e a satisfação do cliente com o Gestor Elite.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/#pricing">Comece Agora</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src={heroImage}
              alt="Ilustração de pessoas analisando gráficos"
              width={600}
              height={550}
              className="mx-auto aspect-[6/5] overflow-hidden rounded-xl object-contain"
              data-ai-hint="data analytics"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
