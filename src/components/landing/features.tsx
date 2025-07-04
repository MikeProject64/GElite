import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Users, Wrench } from 'lucide-react';

const features = [
  {
    icon: <Wrench className="w-8 h-8 text-accent" />,
    title: 'Criação de Ordem de Serviço',
    description: 'Crie e atribua rapidamente ordens de serviço detalhadas. Acompanhe cada trabalho do início à conclusão com campos e modelos personalizáveis.',
  },
  {
    icon: <ClipboardList className="w-8 h-8 text-accent" />,
    title: 'Gerenciamento Abrangente',
    description: 'Gerencie seus técnicos, agendas e inventário a partir de um único painel intuitivo. Otimize rotas e recursos sem esforço.',
  },
  {
    icon: <Users className="w-8 h-8 text-accent" />,
    title: 'CRM Integrado',
    description: 'Construa relacionamentos duradouros com os clientes com um CRM integrado. Acesse o histórico completo do cliente, preferências e registros de comunicação instantaneamente.',
  },
];

export function Features() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Como o ServiceWise Funciona
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Nossa plataforma simplifica cada etapa do seu fluxo de trabalho de serviço.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="flex flex-col items-center text-center p-6 transition-transform transform hover:-translate-y-2">
              <CardHeader className="flex items-center justify-center">
                <div className="p-4 bg-accent/10 rounded-full">
                  {feature.icon}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <CardTitle className="font-headline">{feature.title}</CardTitle>
                <p className="text-muted-foreground font-body">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
