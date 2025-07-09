
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/components/settings-provider';
import { useToast } from '@/hooks/use-toast';
import { availableIcons } from '@/components/icon-map';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Pencil, Wrench, Check } from 'lucide-react';

const settingsFormSchema = z.object({
  siteName: z.string().min(3, { message: 'O nome do site deve ter pelo menos 3 caracteres.' }).max(30, { message: 'O nome do site deve ter no máximo 30 caracteres.' }),
  iconName: z.string({ required_error: 'Por favor, selecione um ícone.' }),
  primaryColorHsl: z.object({
    h: z.number().min(0).max(360),
    s: z.number().min(0).max(100),
    l: z.number().min(0).max(100),
  }).optional(),
});
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

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

const iconNames = Object.keys(availableIcons) as (keyof typeof availableIcons)[];

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings, loadingSettings } = useSettings();
  const { toast } = useToast();
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    if (!loadingSettings) {
      try {
        const welcomeShown = localStorage.getItem('welcomeModalShown_v1');
        if (!welcomeShown) {
          form.reset(settings);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Could not access localStorage:", error);
        // Fallback for environments where localStorage is not available,
        // it just won't show the modal.
      }
    }
  }, [loadingSettings, settings, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      await updateSettings(data);
      toast({ title: 'Sucesso!', description: 'Sua personalização foi salva.' });
      localStorage.setItem('welcomeModalShown_v1', 'true');
      setIsOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar suas configurações.' });
    }
  };

  const handleClose = () => {
    // Also mark as shown if the user closes it manually
    localStorage.setItem('welcomeModalShown_v1', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Bem-vindo(a) ao Gestor Elite!</DialogTitle>
          <DialogDescription>
            Vamos começar personalizando a aparência do seu painel. Você pode alterar isso a qualquer momento nas configurações.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="siteName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa / Site</FormLabel>
                  <FormControl><Input placeholder="Ex: Minha Empresa" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="iconName"
                render={({ field }) => {
                  const SelectedIcon = availableIcons[field.value as keyof typeof availableIcons] || Wrench;
                  return (
                    <FormItem>
                      <FormLabel>Ícone</FormLabel>
                      <div className="flex flex-col items-center gap-2 pt-2">
                        <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-muted"><SelectedIcon className="h-8 w-8 text-muted-foreground" /></div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsIconModalOpen(true)}><Pencil className="mr-2 h-3 w-3" /> Alterar</Button>
                      </div>
                      <FormMessage />
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
                      <div className="flex flex-col items-center gap-2 pt-2">
                         <div className="w-16 h-16 rounded-lg border flex items-center justify-center" style={{ backgroundColor: selectedColor ? `hsl(${selectedColor.hsl.h}, ${selectedColor.hsl.s}%, ${selectedColor.hsl.l}%)` : 'hsl(var(--primary))' }}>
                            <span className="text-white mix-blend-difference font-semibold text-xs text-center p-1">{selectedColor?.name || 'Padrão'}</span>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsColorModalOpen(true)}><Pencil className="mr-2 h-3 w-3" /> Alterar</Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            <DialogFooter className='pt-4'>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar e Começar
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      
      {/* Icon Selection Dialog */}
      <Dialog open={isIconModalOpen} onOpenChange={setIsIconModalOpen}>
        <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Selecione um Ícone</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <RadioGroup onValueChange={(value) => { form.setValue('iconName', value); setIsIconModalOpen(false); }} defaultValue={form.getValues('iconName')} className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-4">
              {iconNames.map((iconName) => {
                const IconComponent = availableIcons[iconName as keyof typeof availableIcons];
                if (!IconComponent) return null;
                return (
                  <FormItem key={iconName}>
                    <FormControl><RadioGroupItem value={iconName} className="sr-only" id={`modal-${iconName}`} /></FormControl>
                    <Label htmlFor={`modal-${iconName}`} className={cn("flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer aspect-square", form.getValues('iconName') === iconName && "border-primary")}>
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
      
      {/* Color Selection Dialog */}
      <Dialog open={isColorModalOpen} onOpenChange={setIsColorModalOpen}>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Selecione uma Cor</DialogTitle></DialogHeader>
              <div className="grid grid-cols-6 gap-2 pt-2">
                  {brandColors.map((color) => (
                      <TooltipProvider key={color.name}>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <button type="button" onClick={() => { form.setValue('primaryColorHsl', color.hsl); setIsColorModalOpen(false); }} className={cn('h-10 w-10 rounded-md', color.bg, 'flex items-center justify-center ring-offset-background transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2')}>
                                      {(() => {
                                        const formColor = form.getValues('primaryColorHsl');
                                        return formColor && formColor.h === color.hsl.h && formColor.s === color.hsl.s && formColor.l === color.hsl.l ? (<Check className="h-5 w-5 text-white mix-blend-difference" />) : null
                                      })()}
                                  </button>
                              </TooltipTrigger>
                              <TooltipContent><p>{color.name}</p></TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  ))}
              </div>
          </DialogContent>
      </Dialog>
    </Dialog>
  );
}
