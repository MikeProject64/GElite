
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSettings, UserSettings } from '@/components/settings-provider';
import { availableIcons } from '@/components/icon-map';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Pencil, Wrench, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconNames = Object.keys(availableIcons) as (keyof typeof availableIcons)[];
const iconTranslations: Record<string, string> = {
    Wrench: 'Ferramenta', Rocket: 'Foguete', Briefcase: 'Maleta', Heart: 'Coração',
    Smile: 'Sorriso', Cog: 'Engrenagem', Shield: 'Escudo', Star: 'Estrela',
    Home: 'Casa', Bolt: 'Raio', Sun: 'Sol', Cloud: 'Nuvem', Anchor: 'Âncora',
    Bike: 'Bicicleta', Book: 'Livro', Camera: 'Câmera', Package: 'Pacote',
    Truck: 'Caminhão', User: 'Usuário', Clock: 'Relógio', Calendar: 'Calendário',
    DollarSign: 'Cifrão', CreditCard: 'Cartão de Crédito', BarChart: 'Gráfico de Barras',
    PieChart: 'Gráfico de Pizza', Clipboard: 'Prancheta', File: 'Arquivo',
    Folder: 'Pasta', Tag: 'Etiqueta', MessageSquare: 'Balão de Fala', Phone: 'Telefone',
    Mail: 'E-mail', Laptop: 'Laptop', Server: 'Servidor', HardDrive: 'HD',
    Database: 'Banco de Dados', FileText: 'Documento', Search: 'Lupa',
    Building2: 'Prédio', Hammer: 'Martelo',
};

const brandColors = [
    { name: 'Céu', hsl: { h: 204, s: 90, l: 58 }, bg: 'bg-sky-400' },
    { name: 'Menta', hsl: { h: 153, s: 68, l: 60 }, bg: 'bg-emerald-400' },
    { name: 'Limão', hsl: { h: 54, s: 100, l: 62 }, bg: 'bg-yellow-300' },
    { name: 'Pêssego', hsl: { h: 28, s: 100, l: 61 }, bg: 'bg-orange-400' },
    { name: 'Salmão', hsl: { h: 5, s: 93, l: 60 }, bg: 'bg-red-400' },
    { name: 'Rosa', hsl: { h: 339, s: 85, l: 66 }, bg: 'bg-pink-400' },
    { name: 'Lavanda', hsl: { h: 250, s: 80, l: 70 }, bg: 'bg-violet-400' },
    { name: 'Azul', hsl: { h: 211, s: 100, l: 50 }, bg: 'bg-blue-500' },
];

const globalSettingsFormSchema = z.object({
  siteName: z.string().min(3, { message: 'O nome do site deve ter pelo menos 3 caracteres.' }).max(30, { message: 'O nome do site deve ter no máximo 30 caracteres.' }),
  iconName: z.string({ required_error: 'Por favor, selecione um ícone.' }),
  primaryColorHsl: z.object({
    h: z.number().min(0).max(360),
    s: z.number().min(0).max(100),
    l: z.number().min(0).max(100),
  }).optional(),
});
type GlobalSettingsFormValues = z.infer<typeof globalSettingsFormSchema>;


function GlobalSettingsForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isIconModalOpen, setIsIconModalOpen] = useState(false);
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);

    const form = useForm<GlobalSettingsFormValues>({
        resolver: zodResolver(globalSettingsFormSchema),
        defaultValues: {
            siteName: '',
            iconName: 'Wrench',
            primaryColorHsl: { h: 210, s: 70, l: 40 },
        },
    });

    useEffect(() => {
        const settingsRef = doc(db, 'siteConfig', 'main');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                form.reset(docSnap.data());
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [form]);

    const onSubmit = async (data: GlobalSettingsFormValues) => {
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'siteConfig', 'main');
            await setDoc(settingsRef, data, { merge: true });
            toast({
                title: 'Sucesso!',
                description: 'As configurações globais do site foram salvas.',
            });
        } catch (error) {
            console.error('Error updating global settings:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar as configurações globais.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
      return (
        <div className="space-y-8">
          <Skeleton className="h-10 w-1/2" />
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-4"> <Skeleton className="h-6 w-1/4" /><Skeleton className="h-16 w-48" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
      )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Site</FormLabel>
                            <FormControl><Input placeholder="Ex: Minha Empresa" {...field} /></FormControl>
                            <FormDescription>Este nome aparecerá em todo o site, incluindo a página inicial e o título das abas do navegador.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="iconName"
                    render={({ field }) => {
                        const SelectedIcon = availableIcons[field.value as keyof typeof availableIcons] || Wrench;
                        return (
                          <FormItem>
                            <FormLabel>Ícone do Site</FormLabel>
                            <div className="flex items-center gap-4 pt-2">
                              <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-muted"><SelectedIcon className="h-8 w-8 text-muted-foreground" /></div>
                              <Button type="button" variant="outline" onClick={() => setIsIconModalOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Alterar Ícone</Button>
                            </div>
                            <FormDescription>Este ícone representará a marca em todo o site.</FormDescription>
                            <FormMessage />
                            <Dialog open={isIconModalOpen} onOpenChange={setIsIconModalOpen}>
                              <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Selecione um Ícone</DialogTitle><DialogDescription>Escolha um ícone para representar seu site.</DialogDescription></DialogHeader>
                                <ScrollArea className="max-h-[60vh]">
                                  <RadioGroup onValueChange={(value) => { field.onChange(value); setIsIconModalOpen(false); }} defaultValue={field.value} className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4">
                                    {iconNames.map((iconName) => {
                                      const IconComponent = availableIcons[iconName as keyof typeof availableIcons];
                                      if (!IconComponent) return null;
                                      return (
                                        <FormItem key={iconName}>
                                          <FormControl><RadioGroupItem value={iconName} className="sr-only" id={iconName} /></FormControl>
                                          <Label htmlFor={iconName} className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer aspect-square", field.value === iconName && "border-primary")}>
                                            <IconComponent className="h-5 w-5 mb-1" />
                                            <span className="text-center text-xs">{iconTranslations[iconName] || iconName}</span>
                                          </Label>
                                        </FormItem>
                                      );
                                    })}
                                  </RadioGroup>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          </FormItem>
                        );
                      }}
                />

                 <FormField
                      control={form.control}
                      name="primaryColorHsl"
                      render={({ field }) => {
                        const selectedColor = brandColors.find(c => field.value && c.hsl.h === field.value.h && c.hsl.s === field.value.s && c.hsl.l === field.value.l);
                        return (
                          <FormItem>
                            <FormLabel>Cor da Marca</FormLabel>
                             <div className="flex items-center gap-4 pt-2">
                                <div className="w-16 h-16 rounded-lg border flex items-center justify-center" style={{ backgroundColor: selectedColor ? `hsl(${selectedColor.hsl.h}, ${selectedColor.hsl.s}%, ${selectedColor.hsl.l}%)` : 'hsl(var(--primary))' }}>
                                    <span className="text-white mix-blend-difference font-semibold text-xs text-center p-1">{selectedColor?.name || 'Padrão'}</span>
                                </div>
                                <Button type="button" variant="outline" onClick={() => setIsColorModalOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Alterar Cor</Button>
                            </div>
                            <FormDescription>Selecione a cor principal que será usada em botões, links e outros elementos de destaque em todo o sistema.</FormDescription>
                            <FormMessage />
                            <Dialog open={isColorModalOpen} onOpenChange={setIsColorModalOpen}>
                                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Selecione uma Cor</DialogTitle><DialogDescription>Esta cor será usada globalmente.</DialogDescription></DialogHeader>
                                    <div className="grid grid-cols-6 gap-2 pt-2">
                                        {brandColors.map((color) => (
                                            <TooltipProvider key={color.name}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button type="button" onClick={() => { field.onChange(color.hsl); setIsColorModalOpen(false); }} className={cn('h-10 w-10 rounded-md', color.bg, 'flex items-center justify-center ring-offset-background transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2')}>
                                                            {field.value && field.value.h === color.hsl.h && field.value.s === color.hsl.s && field.value.l === color.hsl.l ? (<Check className="h-5 w-5 text-white mix-blend-difference" />) : null}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{color.name}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                          </FormItem>
                        );
                      }}
                    />

                <Button type="submit" disabled={isSaving}>
                    {isSaving ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
                    Salvar Configurações Globais
                </Button>
            </form>
        </Form>
    );
}


export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Configurações Globais</h1>
      <Tabs defaultValue="geral" className="w-full">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
        </TabsList>
        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais do Site</CardTitle>
              <CardDescription>Gerencie as configurações de aparência que se aplicam a todo o site, incluindo a página de login e a landing page.</CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalSettingsForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
