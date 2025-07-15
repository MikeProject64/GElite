
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import * as gtag from '@/lib/utils';
import * as fbq from '@/lib/meta-pixel';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { createAndLoginQuickTrialUser } from '@/app/signup/actions';

const trialSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
});

type TrialFormValues = z.infer<typeof trialSchema>;

export function QuickTrialForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TrialFormValues>({
    resolver: zodResolver(trialSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: TrialFormValues) => {
    setIsLoading(true);
    try {
      const result = await createAndLoginQuickTrialUser(values.email);

      if (result.success && result.tempPassword) {
        // Log in the user on the client-side with the temporary password
        await signInWithEmailAndPassword(auth, values.email, result.tempPassword);
        
        // Fire conversion events
        gtag.event({ action: 'generate_lead', params: { currency: "BRL", value: 1 }});
        fbq.event('Lead');

        toast({
          title: 'Bem-vindo(a)! 🎉',
          description: 'Sua conta de teste foi criada. Redirecionando para o painel...',
        });
        
        // The onAuthStateChanged listener in the layout will handle the redirect.
        router.push('/dashboard');

      } else {
        form.setError('email', { type: 'manual', message: result.message });
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro Inesperado',
        description: error.message || 'Ocorreu um erro. Por favor, tente novamente.',
      });
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md space-y-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="email" placeholder="Digite seu e-mail aqui!" className="h-12 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full text-base" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : 'Fazer cadastro'}
        </Button>
      </form>
    </Form>
  );
}
