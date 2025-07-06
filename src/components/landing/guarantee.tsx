import { ShieldCheck, CalendarX, Lock } from 'lucide-react';

const guarantees = [
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: 'Garantia de 7 Dias',
    description: 'Teste nossa plataforma sem riscos. Se não estiver 100% satisfeito, devolvemos seu dinheiro.',
  },
  {
    icon: <CalendarX className="w-8 h-8 text-primary" />,
    title: 'Cancele a Qualquer Momento',
    description: 'Sem contratos de longo prazo. Você tem total controle sobre sua assinatura.',
  },
  {
    icon: <Lock className="w-8 h-8 text-primary" />,
    title: 'Pagamento Seguro',
    description: 'Usamos a tecnologia de ponta do Stripe para garantir que seus dados estejam sempre seguros.',
  },
];

export function Guarantee() {
  return (
    <section id="guarantee" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Sua Satisfação é Nossa Prioridade
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2">
            Invista no seu negócio com total tranquilidade.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {guarantees.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
