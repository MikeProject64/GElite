
'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';

export function Hero() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast({
        title: 'E-mail Inválido',
        description: 'Por favor, insira um endereço de e-mail válido.',
        variant: 'destructive',
      });
      return;
    }
    router.push(`/#pricing?email=${encodeURIComponent(email)}`);
  };

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
            <div className="w-full max-w-lg space-y-2 mx-auto">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Input
                  type="email"
                  placeholder="Digite seu melhor e-mail para começar"
                  className="max-w-lg flex-1 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Começar Agora
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">
                Vamos verificar seu e-mail antes de prosseguir para a escolha do plano.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
