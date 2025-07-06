import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { TrendingUp, Smile, ShieldCheck, DollarSign } from 'lucide-react';

const benefits = [
  {
    icon: <TrendingUp className="w-8 h-8 text-primary" />,
    title: 'Aumente a Produtividade',
    description: 'Automatize tarefas repetitivas e otimize fluxos de trabalho para fazer mais com menos recursos.',
  },
  {
    icon: <Smile className="w-8 h-8 text-primary" />,
    title: 'Aumente a Satisfação do Cliente',
    description: 'Ofereça um serviço mais rápido e confiável e mantenha os clientes informados a cada passo.',
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: 'Tomada de Decisão Mais Inteligente',
    description: 'Aproveite dados e análises em tempo real para identificar tendências e tomar decisões de negócios informadas.',
  },
  {
    icon: <DollarSign className="w-8 h-8 text-primary" />,
    title: 'Reduza Custos Operacionais',
    description: 'Minimize o desperdício, otimize a alocação de recursos e reduza as despesas gerais com um gerenciamento eficiente.',
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Desbloqueie o Potencial do Seu Negócio
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            O Gestor Elite é mais do que uma ferramenta—é um parceiro de crescimento.
          </p>
        </div>
        
        {/* Mobile Carousel View */}
        <div className="md:hidden">
          <Carousel opts={{ align: "start" }} className="w-full max-w-md mx-auto">
            <CarouselContent className="-ml-2">
              {benefits.map((benefit, index) => (
                <CarouselItem key={index} className="basis-11/12 pl-2">
                  <div className="p-1 h-full flex">
                    <Card className="flex flex-col text-center p-4 shadow-sm h-full">
                      <CardContent className="flex flex-col items-center flex-grow pt-6">
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                          {benefit.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-2 font-headline">{benefit.title}</h3>
                        <p className="text-muted-foreground flex-grow font-body">{benefit.description}</p>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="flex flex-col text-center p-4 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex flex-col items-center flex-grow pt-6">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 font-headline">{benefit.title}</h3>
                <p className="text-muted-foreground flex-grow font-body">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
