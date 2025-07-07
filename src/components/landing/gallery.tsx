
'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserSettings } from '@/types';
import { ScrollReveal } from './scroll-reveal';

const defaultImageHints = [
  'dashboard analytics', 'technician repair', 'customer management',
  'modern office', 'tools organized', 'mobile app',
  'productivity chart', 'team meeting', 'scheduling calendar'
];

interface GalleryProps {
  landingPageImages?: UserSettings['landingPageImages'];
}

export function Gallery({ landingPageImages }: GalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const galleryImageUrls = landingPageImages?.galleryImages;

  const imageList = Array.from({ length: 9 }).map((_, index) => {
    return galleryImageUrls?.[index] || 'https://placehold.co/600x400.png';
  });
  
  const galleryItems = imageList.map((url, index) => ({
    src: url,
    alt: `Visualização da galeria ${index + 1}`,
    hint: defaultImageHints[index] || 'software interface',
  }));

  const handleOpenModal = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
  };

  const handleNext = useCallback(() => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prevIndex) => (prevIndex! + 1) % galleryItems.length);
    }
  }, [selectedImageIndex, galleryItems.length]);

  const handlePrev = useCallback(() => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prevIndex) => (prevIndex! - 1 + galleryItems.length) % galleryItems.length);
    }
  }, [selectedImageIndex, galleryItems.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImageIndex, handleNext, handlePrev]);

  return (
    <section id="gallery" className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6 lg:px-24 mx-auto">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Uma Visão do Gestor Elite em Ação
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Veja como nossa plataforma transforma a gestão de serviços em uma experiência visual e intuitiva.
          </p>
        </ScrollReveal>
        
        <ScrollReveal delay={200}>
          {/* Mobile Carousel View */}
          <div className="md:hidden">
            <Carousel opts={{ align: "start" }} className="w-full max-w-md mx-auto">
              <CarouselContent className="-ml-2">
                {galleryItems.map((image, index) => (
                  <CarouselItem key={index} className="basis-11/12 pl-2">
                    <Card
                      className="overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                      onClick={() => handleOpenModal(index)}
                    >
                      <CardContent className="p-0">
                        <Image
                          src={image.src}
                          alt={image.alt}
                          width={600}
                          height={400}
                          className="aspect-[3/2] w-full object-cover"
                          data-ai-hint={image.hint}
                          sizes="90vw"
                        />
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          {/* Desktop Grid View */}
          <div className="hidden md:grid grid-cols-3 gap-4">
            {galleryItems.map((image, index) => (
              <Card
                key={index}
                className="overflow-hidden cursor-pointer group"
                onClick={() => handleOpenModal(index)}
              >
                <CardContent className="p-0 relative">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={600}
                    height={400}
                    className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    data-ai-hint={image.hint}
                    sizes="(max-width: 768px) 90vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-300" />
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollReveal>
      </div>

      <Dialog open={selectedImageIndex !== null} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-none w-full h-full p-0 border-0 bg-black/80 shadow-none flex items-center justify-center">
            {selectedImageIndex !== null && (
                <>
                    <DialogHeader className="sr-only">
                        <DialogTitle>Visualização da Imagem: {galleryItems[selectedImageIndex].alt}</DialogTitle>
                        <DialogDescription>Imagem ampliada da galeria.</DialogDescription>
                    </DialogHeader>
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/20 hover:bg-white/40 text-white"
                        onClick={handlePrev}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>

                    <div className="relative w-full h-full">
                        <Image
                            src={galleryItems[selectedImageIndex].src}
                            alt={galleryItems[selectedImageIndex].alt}
                            fill
                            className="object-contain p-4 sm:p-8 md:p-12"
                            data-ai-hint={galleryItems[selectedImageIndex].hint}
                            sizes="100vw"
                        />
                    </div>
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/20 hover:bg-white/40 text-white"
                        onClick={handleNext}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </>
            )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
