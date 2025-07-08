
'use client';

import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle, Rocket } from 'lucide-react';
import Link from 'next/link';
import { ScrollReveal } from './scroll-reveal';
import * as gtag from '@/lib/utils';

export function FreeTrial() {
  
  const handleCTAClick = () => {
    gtag.event({
      action: 'cta_click',
      params: { cta_name: 'free_trial_section_cta' },
    });
  };

  return (
    <section id="free-trial" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal>
          <div className="rounded-lg bg-primary text-primary-foreground p-8 md:p-12 shadow-2xl">
            <div className="grid md:grid-cols-5 gap-8 items-center">
              <div className="md:col-span-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl xl:text-5xl font-headline">
                  Comece a otimizar hoje, sem compromisso.
                </h2>
                <p className="max-w-[600px] text-primary-foreground/80 md:text-lg mt-4 font-body">
                  Descubra como o Gestor Elite pode transformar sua operação com um teste gratuito de 7 dias.
                </p>
                <ul className="mt-6 space-y-3 font-body">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span>Acesso a <strong>todas as funcionalidades</strong> premium.</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span>Suporte prioritário durante o período de teste.</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-400" />
                    <span><strong>Sem necessidade de cartão de crédito.</strong> Início imediato.</span>
                  </li>
                </ul>
              </div>
              <div className="md:col-span-2 flex flex-col items-center justify-center text-center gap-4 mt-6 md:mt-0">
                 <Rocket className="h-20 w-20 text-primary-foreground/20" />
                 <Button size="lg" variant="secondary" className="w-full" asChild>
                    <Link href="/signup?trial=true" onClick={handleCTAClick}>
                        Iniciar Teste Gratuito Agora
                    </Link>
                  </Button>
                  <p className="text-xs text-primary-foreground/60">Cancele a qualquer momento.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
