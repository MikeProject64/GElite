
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollReveal } from './scroll-reveal';

const faqs = [
  {
    question: 'Preciso instalar algum programa no meu computador?',
    answer: 'Não. O Gestor Elite é 100% online. Você pode acessá-lo de qualquer navegador de internet em seu computador, tablet ou celular, sem a necessidade de instalação.',
  },
  {
    question: 'Meus dados estão seguros na plataforma?',
    answer: 'Sim, a segurança dos seus dados é nossa prioridade máxima. Utilizamos a infraestrutura robusta e segura do Google Cloud para armazenar suas informações, com backups automáticos e criptografia de ponta.',
  },
  {
    question: 'Como funciona o teste gratuito?',
    answer: 'Ao se inscrever para o teste gratuito, você tem acesso a todas as funcionalidades premium da plataforma por 7 dias. Não é necessário cadastrar um cartão de crédito. Ao final do período, você pode escolher o plano que melhor se adapta a você para continuar usando o sistema.',
  },
  {
    question: 'Posso cancelar minha assinatura a qualquer momento?',
    answer: 'Sim. Nossos planos não possuem contrato de fidelidade. Você pode cancelar sua assinatura quando quiser, diretamente no seu painel de controle, sem burocracia.',
  },
  {
    question: 'O sistema é adequado para a minha equipe?',
    answer: 'Com certeza. Você pode cadastrar múltiplos colaboradores e setores, atribuindo ordens de serviço específicas para cada um. O sistema é ideal tanto para profissionais autônomos quanto para pequenas e médias equipes de serviço.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Perguntas Frequentes
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Tire suas dúvidas mais comuns sobre nossa plataforma.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-body text-base font-semibold">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
