
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ScrollReveal } from './scroll-reveal';
import * as gtag from '@/lib/utils';

export function FinalCta() {
  
  const handleCTAClick = (ctaName: string) => {
    gtag.event({
      action: 'cta_click',
      params: { cta_name: ctaName },
    });
  };

  return (
    <section id="final-cta" className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal>
          <div className="rounded-lg bg-card border p-8 md:p-12 shadow-sm text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl xl:text-5xl font-headline">
              Pronto para Transformar sua Gestão?
            </h2>
            <p className="max-w-[600px] mx-auto text-muted-foreground md:text-lg mt-4 font-body">
              Junte-se a centenas de empresas que já otimizaram seus serviços. Comece hoje mesmo.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/#pricing" onClick={() => handleCTAClick('final_cta_comece_agora')}>
                  Ver Planos e Começar Agora
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/signup?trial=true" onClick={() => handleCTAClick('final_cta_teste_gratis')}>
                  Iniciar Teste Gratuito de 7 Dias
                </Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
