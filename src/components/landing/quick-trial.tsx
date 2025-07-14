
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Rocket } from 'lucide-react';
import { createAndLoginQuickTrialUser } from '@/app/signup/actions';
import { useState } from 'react';
import { ScrollReveal } from './scroll-reveal';
import { useRouter } from 'next/navigation';
import * as gtag from '@/lib/utils';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const quickTrialSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

type QuickTrialFormValues = z.infer<typeof quickTrialSchema>;

export function QuickTrial() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickTrialFormValues>({
    resolver: zodResolver(quickTrialSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: QuickTrialFormValues) => {
    setIsLoading(true);
    gtag.event({
      action: 'cta_click',
      params: { cta_name: 'quick_trial_submit' },
    });
    
    const result = await createAndLoginQuickTrialUser(values.email);

    if (result.success && result.email && result.tempPass) {
        try {
            await signInWithEmailAndPassword(auth, result.email, result.tempPass);
            toast({
                title: 'Bem-vindo(a)!',
                description: 'Seu teste gratuito foi iniciado. Enviamos um e-mail para você criar sua senha definitiva.',
                duration: 8000,
            });
            router.push('/dashboard');
        } catch (loginError) {
             toast({
                variant: 'destructive',
                title: 'Falha no Login Automático',
                description: 'Sua conta foi criada, mas não conseguimos fazer o login. Por favor, redefina sua senha através do e-mail que enviamos.',
             });
             setIsLoading(false);
        }
    } else {
      toast({
        variant: 'destructive',
        title: 'Falha no Cadastro',
        description: result.message,
      });
      setIsLoading(false);
    }
  };

  return (
    <section id="quick-trial" className="w-full h-[50vh] bg-primary text-primary-foreground flex items-center justify-center border-b relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-primary" />
        <div className="gradient-bg">
            <div className="gradients-container">
                <div className="g1"></div>
                <div className="g2"></div>
                <div className="g3"></div>
                <div className="g4"></div>
                <div className="g5"></div>
            </div>
        </div>
      </div>
        <div className="container px-4 md:px-6 lg:px-24 mx-auto relative z-10">
            <ScrollReveal>
            <div className="rounded-lg text-center p-8 md:p-12">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
                  Inicie seu Teste Gratuito
                </h2>
                <p className="max-w-[600px] mx-auto text-primary-foreground/80 md:text-lg mt-2 font-body">
                  Coloque seu e-mail e acesse o sistema instantaneamente.
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
                                placeholder="Coloque seu e-mail"
                                className="h-12 text-base text-card-foreground"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage className="text-left text-destructive-foreground/80" />
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
                </div>
                    <p className="text-xs text-primary-foreground/60 mt-2">Acesso completo por 7 dias. Sem necessidade de cartão de crédito.</p>
            </div>
            </ScrollReveal>
        </div>
    </section>
  );
}
