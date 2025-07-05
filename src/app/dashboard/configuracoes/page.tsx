
'use client';

import { useEffect, useState, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings, CustomField, Tag } from '@/components/settings-provider';
import { useToast } from '@/hooks/use-toast';
import { availableIcons } from '@/components/icon-map';
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, PlusCircle, Trash2, Users, FileText, ClipboardEdit, ListChecks, Tag as TagIcon, Briefcase, GripVertical, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const iconNames = Object.keys(availableIcons) as (keyof typeof availableIcons)[];

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

const tagColors: { name: string, value: string }[] = [
    { name: 'Padrão', value: 'bg-muted text-muted-foreground border-border' },
    { name: 'Vermelho', value: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800' },
    { name: 'Laranja', value: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800' },
    { name: 'Amarelo', value: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800' },
    { name: 'Verde', value: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800' },
    { name: 'Azul', value: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' },
    { name: 'Índigo', value: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800' },
    { name: 'Roxo', value: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800' },
    { name: 'Rosa', value: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-800' },
];

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2 bg-muted/50 p-2 rounded-md">
       <button {...listeners} className="cursor-grab p-1 touch-none">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
       </button>
      <div className="flex-grow">{children}</div>
    </div>
  );
}

interface CustomFieldManagerProps {
  title: string;
  icon: React.ReactNode;
  fields: CustomField[];
  onUpdateFields: (fields: CustomField[]) => void;
}

const CustomFieldManager: React.FC<CustomFieldManagerProps> = memo(({ title, icon, fields, onUpdateFields }) => {
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date'>('text');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
          const oldIndex = fields.findIndex((field) => field.id === active.id);
          const newIndex = fields.findIndex((field) => field.id === over.id);
          onUpdateFields(arrayMove(fields, oldIndex, newIndex));
        }
    };

    const handleAddField = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFieldName.trim() === '') return;
        const newField: CustomField = {
            id: uuidv4(),
            name: newFieldName.trim(),
            type: newFieldType,
        };
        onUpdateFields([...fields, newField]);
        setNewFieldName('');
    };

    const handleRemoveField = (id: string) => {
        onUpdateFields(fields.filter(field => field.id !== id));
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">{icon} {title}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddField} className="flex items-end gap-2 mb-4">
                    <div className="grid gap-1.5 flex-grow">
                        <Label htmlFor={`new-field-name-${title}`}>Nome do Campo</Label>
                        <Input id={`new-field-name-${title}`} value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Ex: ID de Referência" />
                    </div>
                    <div className="grid gap-1.5">
                         <Label htmlFor={`new-field-type-${title}`}>Tipo</Label>
                         <Select value={newFieldType} onValueChange={(value) => setNewFieldType(value as any)}>
                            <SelectTrigger id={`new-field-type-${title}`} className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Texto</SelectItem>
                                <SelectItem value="number">Número</SelectItem>
                                <SelectItem value="date">Data</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                </form>
                <div className="space-y-2">
                    {fields.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                {fields.map(field => (
                                    <SortableItem key={field.id} id={field.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <div>
                                                <p className="font-medium">{field.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                                            </div>
                                            <Button size="icon" variant="ghost" onClick={() => handleRemoveField(field.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </SortableItem>
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhum campo personalizado adicionado.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});
CustomFieldManager.displayName = "CustomFieldManager";

const CustomTagManager: React.FC<{ tags: Tag[], onUpdateTags: (tags: Tag[]) => void }> = memo(({ tags, onUpdateTags }) => {
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(tagColors[0].value);

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTagName.trim() === '') return;
        const newTag: Tag = {
            id: uuidv4(),
            name: newTagName.trim(),
            color: newTagColor,
        };
        onUpdateTags([...tags, newTag]);
        setNewTagName('');
    };

    const handleRemoveTag = (id: string) => {
        onUpdateTags(tags.filter(tag => tag.id !== id));
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><TagIcon className="h-5 w-5 text-primary" /> Etiquetas de Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddTag} className="flex items-end gap-2 mb-4">
                    <div className="grid gap-1.5 flex-grow">
                        <Label htmlFor="new-tag-name">Nome da Etiqueta</Label>
                        <Input id="new-tag-name" value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Ex: Cliente VIP" />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="new-tag-color">Cor</Label>
                        <Select value={newTagColor} onValueChange={setNewTagColor}>
                            <SelectTrigger id="new-tag-color" className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {tagColors.map(color => (
                                    <SelectItem key={color.value} value={color.value}>
                                        <div className='flex items-center gap-2'>
                                            <div className={cn('w-3 h-3 rounded-full border', color.value)}></div>
                                            {color.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                </form>
                <div className="space-y-2">
                    {tags.length > 0 ? tags.map(tag => (
                        <div key={tag.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <Badge variant="outline" className={cn('font-medium', tag.color)}>{tag.name}</Badge>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveTag(tag.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    )) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhuma etiqueta criada.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});
CustomTagManager.displayName = "CustomTagManager";

const SkillTagManager: React.FC<{ tags: Tag[], onUpdateTags: (tags: Tag[]) => void }> = memo(({ tags, onUpdateTags }) => {
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(tagColors[0].value);

    const handleAddTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTagName.trim() === '') return;
        const newTag: Tag = {
            id: uuidv4(),
            name: newTagName.trim(),
            color: newTagColor,
        };
        onUpdateTags([...tags, newTag]);
        setNewTagName('');
    };

    const handleRemoveTag = (id: string) => {
        onUpdateTags(tags.filter(tag => tag.id !== id));
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" /> Habilidades de Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddTag} className="flex items-end gap-2 mb-4">
                    <div className="grid gap-1.5 flex-grow">
                        <Label htmlFor="new-skill-tag-name">Nome da Habilidade</Label>
                        <Input id="new-skill-tag-name" value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Ex: Eletricista" />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="new-skill-tag-color">Cor</Label>
                        <Select value={newTagColor} onValueChange={setNewTagColor}>
                            <SelectTrigger id="new-skill-tag-color" className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {tagColors.map(color => (
                                    <SelectItem key={color.value} value={color.value}>
                                        <div className='flex items-center gap-2'>
                                            <div className={cn('w-3 h-3 rounded-full border', color.value)}></div>
                                            {color.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                </form>
                <div className="space-y-2">
                    {tags.length > 0 ? tags.map(tag => (
                        <div key={tag.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <Badge variant="outline" className={cn('font-medium', tag.color)}>{tag.name}</Badge>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveTag(tag.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    )) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhuma habilidade criada.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});
SkillTagManager.displayName = "SkillTagManager";


const CustomStatusManager = () => {
    const { settings, updateSettings } = useSettings();
    const [newStatusName, setNewStatusName] = useState('');
    const coreStatuses = ['Pendente', 'Concluída', 'Cancelada'];

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const statuses = settings.serviceStatuses || [];
        if (over && active.id !== over.id) {
            const oldIndex = statuses.findIndex((status) => status === active.id);
            const newIndex = statuses.findIndex((status) => status === over.id);
            const reorderedStatuses = arrayMove(statuses, oldIndex, newIndex);
            updateSettings({ serviceStatuses: reorderedStatuses });
        }
    };


    const handleAddStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStatusName.trim() === '' || settings.serviceStatuses?.includes(newStatusName.trim())) return;
        const newStatuses = [...(settings.serviceStatuses || []), newStatusName.trim()];
        updateSettings({ serviceStatuses: newStatuses });
        setNewStatusName('');
    };

    const handleRemoveStatus = (statusToRemove: string) => {
        if (coreStatuses.includes(statusToRemove)) return;
        const newStatuses = settings.serviceStatuses?.filter(status => status !== statusToRemove);
        updateSettings({ serviceStatuses: newStatuses });
    };

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="h-5 w-5 text-primary" /> Status de Serviço</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddStatus} className="flex items-end gap-2 mb-4">
                    <div className="grid gap-1.5 flex-grow">
                        <Label htmlFor="new-status-name">Nome do Status</Label>
                        <Input id="new-status-name" value={newStatusName} onChange={e => setNewStatusName(e.target.value)} placeholder="Ex: Orçamento Aprovado" />
                    </div>
                    <Button type="submit" size="icon" variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                </form>
                <div className="space-y-2">
                    {settings.serviceStatuses?.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={settings.serviceStatuses.map(s => s)} strategy={verticalListSortingStrategy}>
                                {settings.serviceStatuses.map(status => (
                                    <SortableItem key={status} id={status}>
                                        <div className="flex items-center justify-between w-full">
                                            <p className="font-medium">{status}</p>
                                            {!coreStatuses.includes(status) && (
                                                <Button size="icon" variant="ghost" onClick={() => handleRemoveStatus(status)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            )}
                                        </div>
                                    </SortableItem>
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhum status personalizado adicionado.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const brandColors = [
    { name: 'Céu', hsl: { h: 204, s: 90, l: 58 }, bg: 'bg-sky-400' },
    { name: 'Menta', hsl: { h: 153, s: 68, l: 60 }, bg: 'bg-emerald-400' },
    { name: 'Limão', hsl: { h: 54, s: 100, l: 62 }, bg: 'bg-yellow-300' },
    { name: 'Pêssego', hsl: { h: 28, s: 100, l: 61 }, bg: 'bg-orange-400' },
    { name: 'Salmão', hsl: { h: 5, s: 93, l: 60 }, bg: 'bg-red-400' },
    { name: 'Rosa', hsl: { h: 339, s: 85, l: 66 }, bg: 'bg-pink-400' },
    { name: 'Lavanda', hsl: { h: 250, s: 80, l: 70 }, bg: 'bg-violet-400' },
    { name: 'Cinza Claro', hsl: { h: 210, s: 14, l: 80 }, bg: 'bg-gray-300' },
    { name: 'Azul', hsl: { h: 211, s: 100, l: 50 }, bg: 'bg-blue-500' },
    { name: 'Verde Mar', hsl: { h: 145, s: 63, l: 49 }, bg: 'bg-green-500' },
    { name: 'Amarelo', hsl: { h: 45, s: 100, l: 51 }, bg: 'bg-yellow-500' },
    { name: 'Laranja', hsl: { h: 24, s: 100, l: 55 }, bg: 'bg-orange-500' },
    { name: 'Vermelho', hsl: { h: 350, s: 91, l: 55 }, bg: 'bg-red-500' },
    { name: 'Vinho', hsl: { h: 326, s: 80, l: 55 }, bg: 'bg-pink-600' },
    { name: 'Índigo', hsl: { h: 245, s: 85, l: 55 }, bg: 'bg-indigo-500' },
    { name: 'Cinza Médio', hsl: { h: 210, s: 10, l: 50 }, bg: 'bg-gray-500' },
    { name: 'Azul Escuro', hsl: { h: 217, s: 89, l: 48 }, bg: 'bg-blue-600' },
    { name: 'Verde Escuro', hsl: { h: 158, s: 80, l: 40 }, bg: 'bg-green-700' },
    { name: 'Mostarda', hsl: { h: 38, s: 100, l: 45 }, bg: 'bg-amber-600' },
    { name: 'Abóbora', hsl: { h: 18, s: 93, l: 47 }, bg: 'bg-orange-600' },
    { name: 'Rubi', hsl: { h: 351, s: 84, l: 45 }, bg: 'bg-red-700' },
    { name: 'Framboesa', hsl: { h: 333, s: 71, l: 45 }, bg: 'bg-rose-700' },
    { name: 'Roxo', hsl: { h: 262, s: 83, l: 58 }, bg: 'bg-violet-600' },
    { name: 'Ardósia', hsl: { h: 210, s: 11, l: 30 }, bg: 'bg-slate-700' },
];


const iconTranslations: Record<string, string> = {
    Wrench: 'Ferramenta',
    Rocket: 'Foguete',
    Briefcase: 'Maleta',
    Heart: 'Coração',
    Smile: 'Sorriso',
    Cog: 'Engrenagem',
    Shield: 'Escudo',
    Star: 'Estrela',
    Home: 'Casa',
    Bolt: 'Raio',
    Sun: 'Sol',
    Cloud: 'Nuvem',
    Anchor: 'Âncora',
    Bike: 'Bicicleta',
    Book: 'Livro',
    Camera: 'Câmera',
    Package: 'Pacote',
    Truck: 'Caminhão',
    User: 'Usuário',
    Clock: 'Relógio',
    Calendar: 'Calendário',
    DollarSign: 'Cifrão',
    CreditCard: 'Cartão de Crédito',
    BarChart: 'Gráfico de Barras',
    PieChart: 'Gráfico de Pizza',
    Clipboard: 'Prancheta',
    File: 'Arquivo',
    Folder: 'Pasta',
    Tag: 'Etiqueta',
    MessageSquare: 'Balão de Fala',
    Phone: 'Telefone',
    Mail: 'E-mail',
    Laptop: 'Laptop',
    Server: 'Servidor',
    HardDrive: 'HD',
    Database: 'Banco de Dados',
    FileText: 'Documento',
    Search: 'Lupa',
    Building2: 'Prédio',
    Hammer: 'Martelo',
    Screwdriver: 'Chave de Fenda',
    PaintBrush: 'Pincel',
};


export default function ConfiguracoesPage() {
  const { settings, updateSettings, loadingSettings } = useSettings();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      siteName: '',
      iconName: '',
      primaryColorHsl: { h: 210, s: 70, l: 40 },
    },
  });

  useEffect(() => {
    if (!loadingSettings) {
      form.reset(settings);
    }
  }, [loadingSettings, settings, form]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      await updateSettings({
        siteName: data.siteName,
        iconName: data.iconName,
        primaryColorHsl: data.primaryColorHsl,
      });
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

  const handleUpdateCustomerFields = (fields: CustomField[]) => {
    updateSettings({ customerCustomFields: fields });
  };

  const handleUpdateServiceOrderFields = (fields: CustomField[]) => {
      updateSettings({ serviceOrderCustomFields: fields });
  };

  const handleUpdateQuoteFields = (fields: CustomField[]) => {
    updateSettings({ quoteCustomFields: fields });
  };

  const handleUpdateTags = (tags: Tag[]) => {
    updateSettings({ tags: tags });
  };
  
  const handleUpdateSkillTags = (tags: Tag[]) => {
    updateSettings({ skillTags: tags });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl">Configurações</h1>
      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="data">Aparência</TabsTrigger>
          <TabsTrigger value="fields">Personalização</TabsTrigger>
          <TabsTrigger value="billing" disabled>Faturamento</TabsTrigger>
        </TabsList>
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
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
                    <Skeleton className="h-10 w-full" />
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
                        <FormItem>
                          <FormLabel>Ícone do Site</FormLabel>
                          <FormDescription>
                            Este ícone aparecerá no menu lateral.
                          </FormDescription>
                           <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 pt-2"
                          >
                            {iconNames.map((iconName) => {
                              const IconComponent = availableIcons[iconName as keyof typeof availableIcons];
                              if (!IconComponent) return null;
                              return (
                                <FormItem key={iconName}>
                                  <FormControl>
                                    <RadioGroupItem value={iconName} className="sr-only" id={iconName} />
                                  </FormControl>
                                  <Label htmlFor={iconName}
                                    className={cn(
                                      "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer aspect-square",
                                      field.value === iconName && "border-primary"
                                    )}
                                  >
                                    <IconComponent className="h-6 w-6 mb-2" />
                                    <span className="text-center text-xs">{iconTranslations[iconName] || iconName}</span>
                                  </Label>
                                </FormItem>
                              );
                            })}
                          </RadioGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="primaryColorHsl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor da Marca</FormLabel>
                          <FormDescription>
                            Selecione uma cor para personalizar a aparência do sistema.
                          </FormDescription>
                          <FormControl>
                            <div className="grid grid-cols-8 gap-2 pt-2">
                                {brandColors.map((color) => (
                                <TooltipProvider key={color.name}>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                        type="button"
                                        onClick={() => field.onChange(color.hsl)}
                                        className={cn(
                                            'h-8 w-8 rounded-md',
                                            color.bg,
                                            'flex items-center justify-center ring-offset-background transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                                        )}
                                        >
                                        {field.value &&
                                        field.value.h === color.hsl.h &&
                                        field.value.s === color.hsl.s &&
                                        field.value.l === color.hsl.l ? (
                                            <Check className="h-5 w-5 text-white mix-blend-difference" />
                                        ) : null}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{color.name}</p>
                                    </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                ))}
                            </div>
                          </FormControl>
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
        <TabsContent value="fields">
            <Card>
                 <CardHeader>
                    <CardTitle>Personalização da Plataforma</CardTitle>
                    <CardDescription>Adicione campos e status customizados para adaptar o sistema ao seu fluxo de trabalho.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingSettings ? (
                         <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                           <CustomTagManager
                                tags={settings.tags || []}
                                onUpdateTags={handleUpdateTags}
                            />
                            <SkillTagManager
                                tags={settings.skillTags || []}
                                onUpdateTags={handleUpdateSkillTags}
                            />
                            <CustomFieldManager
                                title="Campos para Clientes"
                                icon={<Users className="h-5 w-5 text-primary" />}
                                fields={settings.customerCustomFields || []}
                                onUpdateFields={handleUpdateCustomerFields}
                            />
                             <CustomFieldManager
                                title="Campos para Ordens de Serviço"
                                icon={<ClipboardEdit className="h-5 w-5 text-primary" />}
                                fields={settings.serviceOrderCustomFields || []}
                                onUpdateFields={handleUpdateServiceOrderFields}
                            />
                             <CustomFieldManager
                                title="Campos para Orçamentos"
                                icon={<FileText className="h-5 w-5 text-primary" />}
                                fields={settings.quoteCustomFields || []}
                                onUpdateFields={handleUpdateQuoteFields}
                            />
                            <div className="md:col-span-2 lg:col-span-1">
                                <CustomStatusManager />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
