
'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { useSettings } from '@/components/settings-provider';
import type { UserSettings } from '@/types';

const defaultImageHints = [
  'dashboard analytics', 'technician repair', 'customer management',
  'modern office', 'tools organized', 'mobile app',
  'productivity chart', 'team meeting', 'scheduling calendar'
];

interface GalleryProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

export function Gallery({ landingPageImages }: GalleryProps) {
  const { settings } = useSettings();
  
  const serverImages = landingPageImages?.galleryImages;
  const clientImages = settings.landingPageImages?.galleryImages;

  // Always create a 9-item array, filling with available URLs or placeholders
  const imageList = Array.from({ length: 9 }).map((_, index) => {
    return serverImages?.[index] || clientImages?.[index] || 'https://placehold.co/600x400.png';
  });
  
  const galleryItems = imageList.map((url, index) => ({
    src: url,
    alt: `Visualização da galeria ${index + 1}`,
    hint: defaultImageHints[index] || 'software interface',
  }));

  return (
    <section id="gallery" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Uma Visão do Gestor Elite em Ação
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Veja como nossa plataforma transforma a gestão de serviços em uma experiência visual e intuitiva.
          </p>
        </div>

        {/* Mobile Carousel View */}
        <div className="md:hidden">
          <Carousel opts={{ align: "start" }} className="w-full max-w-md mx-auto">
            <CarouselContent className="-ml-2">
              {galleryItems.map((image, index) => (
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
          {galleryItems.map((image, index) => (
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
