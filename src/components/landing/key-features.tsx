import { ClipboardList, Users, Package, FileText, CalendarClock, Briefcase } from 'lucide-react';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollReveal } from './scroll-reveal';

const features = [
  {
    icon: <ClipboardList className="w-7 h-7" />,
    title: 'Gestão de Serviços',
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: 'Base de Clientes (CRM)',
  },
  {
    icon: <Package className="w-7 h-7" />,
    title: 'Controle de Inventário',
  },
  {
    icon: <FileText className="w-7 h-7" />,
    title: 'Criação de Orçamentos',
  },
  {
    icon: <CalendarClock className="w-7 h-7" />,
    title: 'Controle de Prazos',
  },
  {
    icon: <Briefcase className="w-7 h-7" />,
    title: 'Equipes e Colaboradores',
  },
];

export function KeyFeatures() {
  return (
    <section id="key-features" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-16 mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Funcionalidades Essenciais para sua Gestão
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2">
            Tudo o que você precisa para otimizar suas operações em um só lugar.
          </p>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 100}>
              <Card className="transition-transform transform hover:-translate-y-1 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
