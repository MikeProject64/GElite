
'use client';

import Image from 'next/image';
import { ClipboardList, Users, Wrench, CheckCircle } from 'lucide-react';
import React from 'react';
import { useSettings } from '@/components/settings-provider';
import type { UserSettings } from '@/types';

interface FeaturesProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

export function Features({ landingPageImages }: FeaturesProps) {
  const { settings } = useSettings();

  const features = [
    {
      icon: <Wrench className="w-6 h-6 text-primary" />,
      title: 'Criação de Ordem de Serviço Simplificada',
      description: 'Crie e atribua rapidamente ordens de serviço detalhadas com campos e modelos personalizáveis que se adaptam ao seu fluxo de trabalho.',
      benefits: ['Reduza o tempo gasto em cada OS', 'Padronize seus serviços', 'Anexe fotos e documentos facilmente'],
      image: landingPageImages?.feature1Image || settings.landingPageImages?.feature1Image || "https://placehold.co/550x450.png",
      imageHint: "interface service order"
    },
    {
      icon: <ClipboardList className="w-6 h-6 text-primary" />,
      title: 'Visão Completa e Controle Total',
      description: 'Acompanhe tudo em um só lugar. Do status das ordens de serviço aos níveis de inventário e prazos, nosso painel centralizado oferece a clareza que você precisa.',
      benefits: ['Monitore o progresso em tempo real', 'Tome decisões baseadas em dados', 'Identifique gargalos rapidamente'],
      image: landingPageImages?.feature2Image || settings.landingPageImages?.feature2Image || "https://placehold.co/550x450.png",
      imageHint: "dashboard analytics"
    },
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: 'CRM Integrado para Relacionamentos Fortes',
      description: 'Construa relacionamentos duradouros com os clientes com um CRM integrado. Acesse o histórico completo do cliente, preferências e registros de comunicação.',
      benefits: ['Acesse o histórico de cada cliente', 'Personalize o atendimento', 'Aumente a retenção e a fidelidade'],
      image: landingPageImages?.feature3Image || settings.landingPageImages?.feature3Image || "https://placehold.co/550x450.png",
      imageHint: "customer relationship chart"
    },
  ];

  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Como o Gestor Elite Funciona
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Nossa plataforma simplifica cada etapa do seu fluxo de trabalho de serviço, da criação à conclusão.
          </p>
        </div>
        <div className="space-y-16">
          {features.map((feature, index) => (
            <div key={index} className="grid md:grid-cols-2 gap-12 items-center">
              <div className={`flex flex-col justify-center space-y-4 ${index % 2 !== 0 ? 'md:order-last' : ''}`}>
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-primary/10 rounded-full">
                     {feature.icon}
                   </div>
                  <h3 className="text-2xl font-bold font-headline">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground font-body">
                  {feature.description}
                </p>
                 <ul className="space-y-2 font-body">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center">
                 <Image
                    src={feature.image}
                    alt={feature.title}
                    width={550}
                    height={450}
                    className="mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-lg"
                    data-ai-hint={feature.imageHint}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
