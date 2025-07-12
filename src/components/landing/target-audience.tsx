import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, HardHat, Building } from 'lucide-react';
import React from 'react';
import { ScrollReveal } from './scroll-reveal';

const audiences = [
  {
    icon: <User className="w-8 h-8 text-primary" />,
    title: 'Profissionais Autônomos',
    description: 'Para o profissional que trabalha sozinho e busca se profissionalizar. Emita ordens de serviço, gerencie sua agenda e apresente orçamentos que impressionam seus clientes.',
  },
  {
    icon: <HardHat className="w-8 h-8 text-primary" />,
    title: 'Pequenos Negócios',
    description: 'Coordene sua equipe, controle o fluxo de caixa com relatórios claros e otimize seu estoque. O Gestor Elite ajuda seu pequeno negócio a crescer de forma organizada e eficiente.',
  },
  {
    icon: <Building className="w-8 h-8 text-primary" />,
    title: 'Empresas Consolidadas',
    description: 'Obtenha uma visão 360° da sua operação. Monitore KPIs, gerencie contratos de manutenção recorrente e utilize dados para tomar decisões estratégicas que impulsionam o crescimento.',
  },
];

export function TargetAudience() {
  return (
    <section id="target-audience" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Feito para o seu tipo de negócio
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Se você presta serviços, o Gestor Elite foi desenhado para você.
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {audiences.map((audience, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <Card className="text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      {audience.icon}
                    </div>
                  </div>
                  <CardTitle className="font-headline">{audience.title}</CardTitle>
                  <CardDescription className="font-body pt-2">{audience.description}</CardDescription>
                </CardHeader>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
