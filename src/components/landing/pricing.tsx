import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Básico',
    price: 'R$29',
    period: '/mês',
    description: 'Para pequenas equipes que estão começando.',
    features: ['10 Usuários', 'Gerenciamento de Ordens de Serviço', 'Relatórios Básicos', 'Suporte por E-mail'],
    cta: 'Iniciar Teste',
    isPopular: false,
    href: '/signup'
  },
  {
    name: 'Pro',
    price: 'R$79',
    period: '/mês',
    description: 'Para empresas em crescimento que precisam de mais poder.',
    features: ['50 Usuários', 'CRM Avançado', 'Relatórios Personalizáveis', 'Suporte Prioritário', 'Acesso à API'],
    cta: 'Selecionar Plano',
    isPopular: true,
    href: '/signup'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Para grandes organizações com necessidades específicas.',
    features: ['Usuários Ilimitados', 'Gerente de Contas Dedicado', 'Opção On-Premise', 'Garantia de SLA'],
    cta: 'Contate-nos',
    isPopular: false,
    href: 'mailto:vendas@servicewise.com'
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Preços Simples e Transparentes
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Escolha o plano certo para o seu negócio.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <Card key={index} className={`flex flex-col h-full ${plan.isPopular ? 'border-accent shadow-accent/20 shadow-lg' : ''}`}>
              {plan.isPopular && (
                <div className="bg-accent text-accent-foreground text-sm font-bold py-1 text-center rounded-t-lg">
                  Mais Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                <CardDescription className="font-body">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold font-headline">{plan.price}</span>
                  <span className="text-muted-foreground font-body">{plan.period}</span>
                </div>
                <ul className="space-y-4 font-body">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className={`w-full ${plan.isPopular ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}`}>
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
