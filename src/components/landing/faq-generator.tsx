'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateFaqAction } from '@/app/actions';
import { Loader2, Wand2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const FormSchema = z.object({
  urls: z.string().min(1, 'Por favor, insira pelo menos uma URL.').refine(
    (value) => {
      const urls = value.split('\n').filter(Boolean);
      try {
        urls.forEach(url => new URL(url));
        return true;
      } catch (error) {
        return false;
      }
    },
    {
      message: 'Por favor, forneça URLs válidas, uma por linha.',
    }
  ),
});

type FormValues = z.infer<typeof FormSchema>;

export function FaqGenerator() {
  const [faq, setFaq] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      urls: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setFaq(null);

    const urls = data.urls.split('\n').filter(Boolean);

    try {
      const result = await generateFaqAction({ documentUrls: urls });
      if (result.faq) {
        setFaq(result.faq);
      } else {
        throw new Error('Falha ao gerar FAQ. O resultado estava vazio.');
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Gerar FAQ',
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="faq-generator" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
              Gere FAQs com IA
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg font-body">
              Tem sua própria documentação? Cole as URLs abaixo (uma por linha) e nossa IA irá gerar uma página de Perguntas Frequentes para você.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="urls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URLs dos Documentos</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="https://example.com/doc1\nhttps://example.com/doc2"
                          rows={5}
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Gerar FAQ
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
          <div>
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle className="font-headline">FAQ Gerado</CardTitle>
                <CardDescription>Suas perguntas e respostas geradas por IA aparecerão aqui.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <div className="pt-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                ) : faq ? (
                  <pre className="whitespace-pre-wrap font-body text-sm bg-secondary p-4 rounded-md">
                    {faq}
                  </pre>
                ) : (
                  <div className="text-center text-muted-foreground pt-16">
                    <p>Pronto para criar seu FAQ?</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
