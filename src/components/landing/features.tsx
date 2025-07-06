import Image from 'next/image';
import { ClipboardList, Users, Wrench } from 'lucide-react';
import React from 'react';

const features = [
  {
    icon: <Wrench className="w-6 h-6 text-primary" />,
    title: 'Criação de Ordem de Serviço Simplificada',
    description: 'Crie e atribua rapidamente ordens de serviço detalhadas. Acompanhe cada trabalho do início à conclusão com campos e modelos personalizáveis que se adaptam ao seu fluxo de trabalho.',
    image: "https://placehold.co/550x450.png",
    imageHint: "interface service order"
  },
  {
    icon: <ClipboardList className="w-6 h-6 text-primary" />,
    title: 'Gerenciamento e Agendamento Centralizado',
    description: 'Gerencie seus técnicos, agendas e inventário a partir de um único painel intuitivo. Otimize rotas, aloque recursos de forma eficiente e tenha uma visão clara de todos os prazos.',
    image: "https://placehold.co/550x450.png",
    imageHint: "dashboard analytics"
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: 'CRM Integrado para Relacionamentos Fortes',
    description: 'Construa relacionamentos duradouros com os clientes com um CRM integrado. Acesse o histórico completo do cliente, preferências e registros de comunicação instantaneamente.',
    image: "https://placehold.co/550x450.png",
    imageHint: "customer relationship chart"
  },
];

export function Features() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Como o ServiceWise Funciona
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
