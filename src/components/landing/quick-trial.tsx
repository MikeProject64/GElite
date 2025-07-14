
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { createQuickTrialUser } from '@/app/signup/actions';
import { useState } from 'react';
import { ScrollReveal } from './scroll-reveal';
import { useRouter } from 'next/navigation';

const quickTrialSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

type QuickTrialFormValues = z.infer<typeof quickTrialSchema>;

export function QuickTrial() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<QuickTrialFormValues>({
    resolver: zodResolver(quickTrialSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: QuickTrialFormValues) => {
    setIsLoading(true);
    const result = await createQuickTrialUser(values.email);

    if (result.success) {
      toast({
        title: 'Conta Criada com Sucesso!',
        description: 'Enviamos um link para você definir sua senha. Verifique sua caixa de entrada e spam.',
        duration: 8000,
      });
      setIsSuccess(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Falha no Cadastro',
        description: result.message,
      });
    }
    setIsLoading(false);
  };

  return (
    <section className="w-full h-[50vh] bg-card flex items-center justify-center border-b">
      <div className="container px-4 md:px-6 text-center">
        <ScrollReveal>
          {isSuccess ? (
            <div className="max-w-xl mx-auto">
              <Mail className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                Verifique seu E-mail!
              </h2>
              <p className="text-muted-foreground md:text-lg mt-2 font-body">
                Enviamos um link seguro para você definir sua senha e acessar o sistema.
              </p>
              <Button onClick={() => router.push('/login')} className="mt-6">Ir para o Login</Button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                Inicie seu teste grátis
              </h2>
              <p className="max-w-[600px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
                Coloque seu e-mail abaixo e acesse o sistema instantaneamente.
              </p>
              <div className="w-full max-w-md mx-auto mt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start space-x-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              className="h-12 text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" size="lg" className="h-12" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        'Acessar Agora'
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
