import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function FinalCta() {
  return (
    <section id="final-cta" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary">
            Pronto para Transformar Suas Operações de Serviço?
          </h2>
          <p className="max-w-[600px] text-muted-foreground md:text-xl font-body">
            Junte-se a centenas de empresas que estão crescendo com o ServiceWise. Comece hoje mesmo com um teste sem riscos.
          </p>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href="/signup">Inicie Seu Teste Gratuito</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
