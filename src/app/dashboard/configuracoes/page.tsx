
'use client';

import { useEffect, useState, memo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings, CustomField, Tag } from '@/components/settings-provider';
import { useToast } from '@/hooks/use-toast';
import { availableIcons } from '@/components/icon-map';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, PlusCircle, Trash2, Users, FileText, ClipboardEdit, ListChecks, Tag as TagIcon, Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


const iconNames = Object.keys(availableIcons) as (keyof typeof availableIcons)[];

const settingsFormSchema = z.object({
  siteName: z.string().min(3, { message: 'O nome do site deve ter pelo menos 3 caracteres.' }).max(30, { message: 'O nome do site deve ter no máximo 30 caracteres.' }),
  iconName: z.string({ required_error: 'Por favor, selecione um ícone.' }),
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

interface CustomFieldManagerProps {
  title: string;
  icon: React.ReactNode;
  fields: CustomField[];
  onUpdateFields: (fields: CustomField[]) => void;
}

const CustomFieldManager: React.FC<CustomFieldManagerProps> = memo(({ title, icon, fields, onUpdateFields }) => {
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date'>('text');

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
                    {fields.length > 0 ? fields.map(field => (
                        <div key={field.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div>
                                <p className="font-medium">{field.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => handleRemoveField(field.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    )) : (
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

    const handleAddStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStatusName.trim() === '' || settings.serviceStatuses?.includes(newStatusName.trim())) return;
        const newStatuses = [...(settings.serviceStatuses || []), newStatusName.trim()];
        updateSettings({ serviceStatuses: newStatuses });
        setNewStatusName('');
    };

    const handleRemoveStatus = (statusToRemove: string) => {
        if (statusToRemove === 'Concluída') return;
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
                    {settings.serviceStatuses?.length > 0 ? settings.serviceStatuses.map(status => (
                        <div key={status} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <p className="font-medium">{status}</p>
                            {status !== 'Concluída' && (
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveStatus(status)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            )}
                        </div>
                    )) : (
                        <p className="text-sm text-center text-muted-foreground py-4">Nenhum status personalizado adicionado.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

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
      await updateSettings({ siteName: data.siteName, iconName: data.iconName });
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
          <TabsTrigger value="data">Dados do Site</TabsTrigger>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <div className="flex items-center gap-2">
                                  {field.value && availableIcons[field.value as keyof typeof availableIcons] && 
                                    React.createElement(availableIcons[field.value as keyof typeof availableIcons], { className: "h-4 w-4 text-muted-foreground" })
                                  }
                                  <SelectValue placeholder="Selecione um ícone" />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {iconNames.map((iconName) => {
                                const IconComponent = availableIcons[iconName as keyof typeof availableIcons];
                                if (!IconComponent) return null;
                                return (
                                  <SelectItem key={iconName} value={iconName}>
                                    <div className="flex items-center gap-2">
                                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                                        <span>{iconName}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Este ícone aparecerá no menu lateral.
                          </FormDescription>
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
