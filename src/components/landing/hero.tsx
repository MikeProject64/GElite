import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-card">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid gap-6 lg:grid-cols-1 lg:gap-x-12 items-center">
          <div className="flex flex-col justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline text-primary">
                Modernize Sua Gestão de Serviços
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl mx-auto font-body">
                O ServiceWise oferece uma plataforma tudo-em-um para otimizar operações, aumentar a satisfação do cliente e impulsionar o crescimento do negócio.
              </p>
            </div>
            <div className="w-full max-w-sm space-y-2 mx-auto">
              <div className="flex justify-center space-x-4">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Teste Gratuitamente
                </Button>
                <Button size="lg" variant="outline">
                  Escolha um Plano
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
