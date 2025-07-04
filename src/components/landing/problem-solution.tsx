import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export function ProblemSolution() {
  return (
    <section id="problem-solution" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Cansado de uma Gestão de Serviços Ineficiente?
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Ferramentas desconectadas e processos manuais levam a perda de tempo, clientes frustrados e prejuízo.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <Card className="bg-destructive/10 border-destructive/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <CardTitle className="font-headline text-destructive">O Problema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-body text-destructive/80">
                <p>Dados de clientes espalhados levam a um serviço impessoal.</p>
                <p>O agendamento manual causa atrasos e agendamentos duplicados.</p>
                <p>A falta de visibilidade em tempo real dificulta a tomada de decisões.</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/10 border-primary/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <CardTitle className="font-headline text-primary">A Solução ServiceWise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-body text-primary/80">
                <p>CRM centralizado para uma visão 360 graus do cliente.</p>
                <p>Despacho automatizado e agendamento inteligente.</p>
                <p>Painéis de análise poderosos para insights baseados em dados.</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-center">
            <Image
              src="https://placehold.co/500x500.png"
              alt="Diagrama do Problema e Solução"
              width={500}
              height={500}
              className="rounded-xl shadow-lg"
              data-ai-hint="workflow diagram"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
