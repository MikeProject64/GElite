
'use client';

import Image from 'next/image';
import { ClipboardList, Users, Wrench, CheckCircle } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import type { UserSettings } from '@/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollReveal } from './scroll-reveal';

interface FeaturesProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

const featuresData = [
  {
    icon: <Wrench className="w-6 h-6 text-primary" />,
    title: 'Criação de Ordem de Serviço Simplificada',
    description: 'Crie e atribua rapidamente ordens de serviço detalhadas com campos e modelos personalizáveis que se adaptam ao seu fluxo de trabalho.',
    benefits: ['Reduza o tempo gasto em cada OS', 'Padronize seus serviços', 'Anexe fotos e documentos facilmente'],
    image: "https://placehold.co/550x450.png",
    imageKey: 'feature1Image' as keyof NonNullable<UserSettings['landingPageImages']>,
    imageHint: "interface service order"
  },
  {
    icon: <ClipboardList className="w-6 h-6 text-primary" />,
    title: 'Visão Completa e Controle Total',
    description: 'Acompanhe tudo em um só lugar. Do status das ordens de serviço aos níveis de inventário e prazos, nosso painel centralizado oferece a clareza que você precisa.',
    benefits: ['Monitore o progresso em tempo real', 'Tome decisões baseadas em dados', 'Identifique gargalos rapidamente'],
    image: "https://placehold.co/550x450.png",
    imageKey: 'feature2Image' as keyof NonNullable<UserSettings['landingPageImages']>,
    imageHint: "dashboard analytics"
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: 'CRM Integrado para Relacionamentos Fortes',
    description: 'Construa relacionamentos duradouros com os clientes com um CRM integrado. Acesse o histórico completo do cliente, preferências e registros de comunicação.',
    benefits: ['Acesse o histórico de cada cliente', 'Personalize o atendimento', 'Aumente a retenção e a fidelidade'],
    image: "https://placehold.co/550x450.png",
    imageKey: 'feature3Image' as keyof NonNullable<UserSettings['landingPageImages']>,
    imageHint: "customer relationship chart"
  },
];


export function Features({ landingPageImages }: FeaturesProps) {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setActiveFeatureIndex(index);
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    );

    const currentRefs = featureRefs.current;
    currentRefs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      currentRefs.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [isMobile]);
  
  const features = featuresData.map(f => ({...f, image: landingPageImages?.[f.imageKey] || f.image }));

  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Como o Gestor Elite Funciona
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Nossa plataforma simplifica cada etapa do seu fluxo de trabalho de serviço, da criação à conclusão.
          </p>
        </ScrollReveal>
        
        {/* Mobile View - Simple Scroll */}
        {isMobile && (
            <div className="space-y-16">
              {features.map((feature, index) => (
                <div key={index} className="grid gap-8 items-center">
                  <ScrollReveal className="flex flex-col justify-center space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="p-3 bg-primary/10 rounded-full">{feature.icon}</div>
                      <h3 className="text-2xl font-bold font-headline">{feature.title}</h3>
                    </div>
                    <p className="text-muted-foreground font-body">{feature.description}</p>
                     <ul className="space-y-2 font-body">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollReveal>
                  <ScrollReveal delay={100} className="flex justify-center">
                     <Image
                        src={feature.image}
                        alt={feature.title}
                        width={550}
                        height={450}
                        className="mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-lg"
                        data-ai-hint={feature.imageHint}
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </ScrollReveal>
                </div>
              ))}
            </div>
        )}
        
        {/* Desktop View - Sticky Scroll */}
        {!isMobile && (
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div className="space-y-24">
              {features.map((feature, index) => (
                <div
                  key={index}
                  ref={(el) => (featureRefs.current[index] = el)}
                  data-index={index}
                  className={cn(
                    "transition-opacity duration-500",
                    activeFeatureIndex === index ? "opacity-100" : "opacity-30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full">{feature.icon}</div>
                    <h3 className="text-2xl font-bold font-headline">{feature.title}</h3>
                  </div>
                  <p className="mt-4 text-muted-foreground font-body">{feature.description}</p>
                  <ul className="mt-4 space-y-2 font-body">
                    {feature.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="sticky top-28 h-[500px] flex items-center justify-center">
              {features.map((feature, index) => (
                <Image
                  key={index}
                  src={feature.image}
                  alt={feature.title}
                  width={550}
                  height={450}
                  className={cn(
                    "mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-lg transition-opacity duration-500 absolute inset-0",
                    activeFeatureIndex === index ? "opacity-100" : "opacity-0"
                  )}
                  data-ai-hint={feature.imageHint}
                  sizes="50vw"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
