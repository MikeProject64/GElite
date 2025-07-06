import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle } from 'lucide-react';

const comparisonData = [
  {
    feature: 'Acesso à Informação',
    oldWay: 'Documentos espalhados, difícil de encontrar.',
    newWay: 'Tudo centralizado e acessível em segundos.',
  },
  {
    feature: 'Histórico do Cliente',
    oldWay: 'Depende da memória ou de anotações perdidas.',
    newWay: 'Histórico completo de serviços com um clique.',
  },
  {
    feature: 'Controle de Prazos',
    oldWay: 'Agendas de papel, risco de esquecimento.',
    newWay: 'Notificações automáticas e visão de calendário.',
  },
  {
    feature: 'Comunicação com a Equipe',
    oldWay: 'Grupos de WhatsApp, informações se perdem.',
    newWay: 'Atribuição de tarefas e status claro para todos.',
  },
  {
    feature: 'Geração de Orçamentos',
    oldWay: 'Processo manual, demorado e com erros.',
    newWay: 'Modelos prontos e envio rápido ao cliente.',
  },
];

export function Comparison() {
  return (
    <section id="comparison" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Diga Adeus às Planilhas e à Desorganização
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Veja a diferença que uma ferramenta de gestão de verdade pode fazer no seu dia a dia.
          </p>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] font-headline">Funcionalidade</TableHead>
                  <TableHead className="font-headline">Com Planilhas e Papel</TableHead>
                  <TableHead className="font-headline text-primary">Com o Gestor Elite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((item) => (
                  <TableRow key={item.feature}>
                    <TableCell className="font-semibold font-body">{item.feature}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="w-5 h-5 text-destructive" />
                        <span className='font-body'>{item.oldWay}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                         <CheckCircle className="w-5 h-5 text-green-500" />
                         <span className='font-body'>{item.newWay}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
