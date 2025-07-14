
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Rocket } from 'lucide-react';
import { useState } from 'react';
import { ScrollReveal } from './scroll-reveal';
import { useRouter } from 'next/navigation';
import * as gtag from '@/lib/utils';


const quickTrialSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

type QuickTrialFormValues = z.infer<typeof quickTrialSchema>;

export function QuickTrial() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickTrialFormValues>({
    resolver: zodResolver(quickTrialSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: QuickTrialFormValues) => {
    setIsLoading(true);
    gtag.event({
      action: 'cta_click',
      params: { cta_name: 'quick_trial_submit' },
    });
    const params = new URLSearchParams({
      trial: 'true',
      email: values.email,
    });
    router.push(`/signup?${params.toString()}`);
  };

  return (
    <section id="quick-trial" className="w-full py-12 md:py-20 lg:py-24 bg-card border-b">
        <div className="container px-4 md:px-6 lg:px-24 mx-auto">
            <ScrollReveal>
            <div className="rounded-lg bg-primary text-primary-foreground p-8 md:p-12 shadow-lg">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="">
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                            A maneira mais rápida de começar.
                        </h2>
                        <p className="max-w-[600px] text-primary-foreground/80 md:text-lg mt-4 font-body">
                            Insira seu e-mail e inicie seu teste gratuito de 7 dias agora mesmo.
                        </p>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center gap-4 mt-6 md:mt-0">
                        <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full max-w-md items-start space-x-2">
                            <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                <FormControl>
                                    <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="h-12 text-base text-card-foreground"
                                    {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-left text-primary-foreground/80" />
                                </FormItem>
                            )}
                            />
                            <Button type="submit" size="lg" variant="secondary" className="h-12" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Rocket className="h-5 w-5" />
                            )}
                             <span className='sr-only'>Iniciar Teste</span>
                            </Button>
                        </form>
                        </Form>
                         <p className="text-xs text-primary-foreground/60">Acesso completo. Sem necessidade de cartão de crédito.</p>
                    </div>
                </div>
            </div>
            </ScrollReveal>
        </div>
    </section>
  );
}
