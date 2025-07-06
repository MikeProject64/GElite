import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="w-full py-20 md:py-32 lg:py-40 bg-card">
      <div className="container px-4 md:px-6 lg:px-16 mx-auto">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-x-16 items-center">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                GESTÃO DE SERVIÇOS
              </p>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary">
                Um software para uma gestão de serviço 100% integrada.
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                O ServiceWise oferece uma plataforma tudo-em-um para otimizar operações, aumentar a satisfação do cliente e impulsionar o crescimento do negócio.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link href="/signup">Conheça mais</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <Image
              src="https://placehold.co/600x550.png"
              alt="Ilustração de pessoas analisando gráficos"
              width={600}
              height={550}
              className="mx-auto aspect-[6/5] overflow-hidden rounded-xl object-contain"
              data-ai-hint="data analytics"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
