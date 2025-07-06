'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';

const galleryImages = [
  { src: 'https://placehold.co/600x400.png', alt: 'Dashboard de Análise de Dados', hint: 'dashboard analytics' },
  { src: 'https://placehold.co/600x400.png', alt: 'Técnico realizando serviço de reparo', hint: 'technician repair' },
  { src: 'https://placehold.co/600x400.png', alt: 'Interface de gerenciamento de clientes', hint: 'customer management' },
  { src: 'https://placehold.co/600x400.png', alt: 'Vista de um escritório moderno', hint: 'modern office' },
  { src: 'https://placehold.co/600x400.png', alt: 'Ferramentas de serviço organizadas', hint: 'tools organized' },
  { src: 'https://placehold.co/600x400.png', alt: 'Aplicativo móvel para ordens de serviço', hint: 'mobile app' },
  { src: 'https://placehold.co/600x400.png', alt: 'Gráfico de crescimento de produtividade', hint: 'productivity chart' },
  { src: 'https://placehold.co/600x400.png', alt: 'Equipe de serviço em reunião', hint: 'team meeting' },
  { src: 'https://placehold.co/600x400.png', alt: 'Calendário de agendamento de serviços', hint: 'scheduling calendar' }
];

export function Gallery() {
  return (
    <section id="gallery" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Uma Visão do ServiceWise em Ação
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2">
            Veja como nossa plataforma transforma a gestão de serviços em uma experiência visual e intuitiva.
          </p>
        </div>

        {/* Mobile Carousel View */}
        <div className="md:hidden">
          <Carousel opts={{ align: "start" }} className="w-full max-w-md mx-auto">
            <CarouselContent className="-ml-2">
              {galleryImages.map((image, index) => (
                <CarouselItem key={index} className="basis-11/12 pl-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Card className="overflow-hidden cursor-pointer transform transition-transform hover:scale-105">
                                <CardContent className="p-0">
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    width={600}
                                    height={400}
                                    className="aspect-[3/2] w-full object-cover"
                                    data-ai-hint={image.hint}
                                />
                                </CardContent>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-auto p-0 border-0 bg-transparent shadow-none">
                             <DialogHeader className="sr-only">
                                <DialogTitle>Visualização da Imagem: {image.alt}</DialogTitle>
                                <DialogDescription>Imagem ampliada da galeria. {image.alt}.</DialogDescription>
                            </DialogHeader>
                             <Image
                                src={image.src}
                                alt={image.alt}
                                width={1200}
                                height={800}
                                className="w-full h-auto object-contain rounded-lg"
                                data-ai-hint={image.hint}
                            />
                        </DialogContent>
                    </Dialog>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid grid-cols-3 gap-4">
          {galleryImages.map((image, index) => (
            <Dialog key={index}>
                <DialogTrigger asChild>
                    <Card className="overflow-hidden cursor-pointer group">
                        <CardContent className="p-0 relative">
                        <Image
                            src={image.src}
                            alt={image.alt}
                            width={600}
                            height={400}
                            className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            data-ai-hint={image.hint}
                        />
                         <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300" />
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-auto p-0 border-0 bg-transparent shadow-none">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Visualização da Imagem: {image.alt}</DialogTitle>
                        <DialogDescription>Imagem ampliada da galeria. {image.alt}.</DialogDescription>
                    </DialogHeader>
                     <Image
                        src={image.src}
                        alt={image.alt}
                        width={1200}
                        height={800}
                        className="w-full h-auto object-contain rounded-lg"
                        data-ai-hint={image.hint}
                    />
                </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    </section>
  );
}
