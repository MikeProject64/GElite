import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, HardHat, Building } from 'lucide-react';
import React from 'react';

const audiences = [
  {
    icon: <User className="w-8 h-8 text-primary" />,
    title: 'Técnicos Autônomos',
    description: 'Organize sua agenda, gerencie clientes e emita ordens de serviço de forma profissional, tudo pelo celular ou computador.',
  },
  {
    icon: <HardHat className="w-8 h-8 text-primary" />,
    title: 'Pequenas Empresas de Manutenção',
    description: 'Coordene sua equipe, controle o inventário de peças e tenha uma visão clara de todos os serviços em andamento.',
  },
  {
    icon: <Building className="w-8 h-8 text-primary" />,
    title: 'Lojas de Reparo e Assistências Técnicas',
    description: 'Gerencie o fluxo de aparelhos, comunique-se com os clientes e controle cada etapa do reparo, do diagnóstico à entrega.',
  },
];

export function TargetAudience() {
  return (
    <section id="target-audience" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Feito para o seu tipo de negócio
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Se você presta serviços, o Gestor Elite foi desenhado para você.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {audiences.map((audience, index) => (
            <Card key={index} className="text-center shadow-sm hover:shadow-lg transition-shadow duration-300">
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
          ))}
        </div>
      </div>
    </section>
  );
}
