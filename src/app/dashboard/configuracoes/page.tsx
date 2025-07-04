
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings, UserSettings } from '@/components/settings-provider';
import { useToast } from '@/hooks/use-toast';
import { availableIcons } from '@/components/icon-map';
import type { iconNames as IconNamesType } from '@/components/icon-map';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const iconNames = Object.keys(availableIcons) as (keyof typeof availableIcons)[];

const settingsFormSchema = z.object({
  siteName: z.string().min(3, { message: 'O nome do site deve ter pelo menos 3 caracteres.' }).max(30, { message: 'O nome do site deve ter no máximo 30 caracteres.' }),
  iconName: z.string({ required_error: 'Por favor, selecione um ícone.' }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function ConfiguracoesPage() {
  const { settings, updateSettings, loadingSettings } = useSettings();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      siteName: '',
      iconName: '',
    },
  });

  useEffect(() => {
    if (!loadingSettings) {
      form.reset(settings);
    }
  }, [loadingSettings, settings, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      await updateSettings(data);
      toast({
        title: 'Sucesso!',
        description: 'Suas configurações foram salvas.',
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar suas configurações.',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl">Configurações</h1>
      <Tabs defaultValue="data">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="data">Dados</TabsTrigger>
          <TabsTrigger value="billing" disabled>Faturamento</TabsTrigger>
        </TabsList>
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Site</CardTitle>
              <CardDescription>
                Personalize a aparência do seu site. As alterações serão salvas apenas para você.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
                <div className="space-y-8">
                  <Skeleton className="h-10 w-1/2" />
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/4" />
                    <div className="grid grid-cols-6 gap-4">
                      {[...Array(12)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-16 rounded-md" />
                      ))}
                    </div>
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Site</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Minha Empresa" {...field} />
                          </FormControl>
                          <FormDescription>
                            Este nome aparecerá no menu e no título da página.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="iconName"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Ícone do Site</FormLabel>
                          <FormControl>
                            <div className="max-w-lg">
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2"
                              >
                                {iconNames.map((iconName) => {
                                  const IconComponent = availableIcons[iconName as keyof typeof availableIcons];
                                  return (
                                    <FormItem key={iconName}>
                                      <FormControl>
                                        <RadioGroupItem value={iconName as string} className="sr-only" />
                                      </FormControl>
                                      <FormLabel className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/10 cursor-pointer aspect-square">
                                        <IconComponent className="h-5 w-5" />
                                      </FormLabel>
                                    </FormItem>
                                  );
                                })}
                              </RadioGroup>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Salvar Alterações
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
