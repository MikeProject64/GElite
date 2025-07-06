import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useSettings } from '../settings-provider';
import type { UserSettings } from '@/types';

interface TestimonialsProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

export function Testimonials({ landingPageImages }: TestimonialsProps) {
  const { settings } = useSettings();

  const testimonials = [
    {
      quote: "O Gestor Elite transformou nossa operação. O que antes levava horas em planilhas, agora resolvemos em minutos. Nossos clientes estão mais satisfeitos do que nunca.",
      name: "Carlos Silva",
      title: "Sócio-Diretor, Ar Frio Refrigeração",
      avatar: "CS",
      image: landingPageImages?.testimonial1Image || settings.landingPageImages?.testimonial1Image || "https://placehold.co/100x100.png"
    },
    {
      quote: "Como autônomo, organização é tudo. Este software me deu o controle que eu precisava para gerenciar meus serviços e clientes sem dor de cabeça. Recomendo!",
      name: "Fernanda Lima",
      title: "Técnica de Eletrônicos",
      avatar: "FL",
      image: landingPageImages?.testimonial2Image || settings.landingPageImages?.testimonial2Image || "https://placehold.co/100x100.png"
    },
    {
      quote: "Finalmente encontramos um sistema que entende as necessidades de uma assistência técnica. O controle de inventário e o histórico de clientes são fantásticos.",
      name: "Roberto Nunes",
      title: "Gerente, ConsertaTudo Celulares",
      avatar: "RN",
      image: landingPageImages?.testimonial3Image || settings.landingPageImages?.testimonial3Image || "https://placehold.co/100x100.png"
    }
  ];

  return (
    <section id="testimonials" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            O que nossos clientes dizem
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Empresas reais, resultados reais. Veja como o Gestor Elite está fazendo a diferença.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 shadow-sm">
              <CardContent className="p-0">
                <blockquote className="text-lg font-body leading-relaxed text-foreground mb-4">
                  “{testimonial.quote}”
                </blockquote>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={testimonial.image} alt={testimonial.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
