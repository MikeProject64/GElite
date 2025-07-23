'use client';

import { useEffect, useState, FC } from 'react';
import { useForm, useFieldArray, Control, FormProvider, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Loader2, Save, GripVertical, Plus, Trash2, icons } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { nanoid } from 'nanoid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { syncFunctionsFromFiles } from './actions';
import { RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';


// --- TIPOS E SCHEMAS ---

// Novo catálogo de ícones categorizados
const iconCategories = [
    {
        title: 'Principal e Painel',
        icons: ['LayoutDashboard', 'Home', 'BarChartBig', 'PieChart', 'BarChartHorizontalBig', 'AreaChart', 'LineChart'] as (keyof typeof icons)[],
    },
    {
        title: 'Serviços e Operações',
        icons: ['Wrench', 'Hammer', 'Truck', 'CalendarClock', 'Timer', 'FileSignature', 'FileText', 'Calculator', 'Receipt', 'PackageCheck', 'Construction', 'DraftingCompass'] as (keyof typeof icons)[],
    },
    {
        title: 'Relacionamento e CRM',
        icons: ['Users', 'Contact', 'AddressBook', 'UserCog', 'UserCheck', 'Briefcase', 'MessageSquare', 'Bot', 'Handshake', 'HeartHandshake', 'Target', 'Building2'] as (keyof typeof icons)[],
    },
    {
        title: 'Recursos e Conteúdo',
        icons: ['Boxes', 'Archive', 'Package', 'BookOpen', 'GraduationCap', 'HelpCircle', 'Library', 'Notebook', 'Bookmark'] as (keyof typeof icons)[],
    },
    {
        title: 'Administração e Configurações',
        icons: ['History', 'ClipboardList', 'UserCircle', 'Cog', 'Settings', 'SlidersHorizontal', 'CreditCard', 'Wallet', 'Gem', 'Shield', 'KeyRound', 'Lock'] as (keyof typeof icons)[],
    },
    {
        title: 'Ícones Comuns de Interface',
        icons: ['Plus', 'Minus', 'X', 'Check', 'Search', 'Menu', 'MoreHorizontal', 'Trash2', 'Edit', 'Copy', 'Save', 'LogOut', 'LogIn', 'Link', 'AlertTriangle', 'Info', 'GripVertical', 'File', 'Folder'] as (keyof typeof icons)[],
    }
];

const allCategorizedIcons = iconCategories.flatMap(category => category.icons);

// Nova definição para uma Função
const functionSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "O nome da função é obrigatório."),
  href: z.string().startsWith('/', "O caminho deve começar com /"),
  isActive: z.boolean().default(true),
});

type AppFunction = z.infer<typeof functionSchema>;


type NavMenuItem = {
  id: string;
  label: string;
  href?: string;
  icon: string;
  enabled: boolean;
  functionId?: string; // Se for um link para uma função
  subItems?: NavMenuItem[];
};

const navMenuItemSchema: z.ZodType<NavMenuItem> = z.object({
  id: z.string(),
  label: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  href: z.string().optional(),
  icon: z.string(),
  enabled: z.boolean(),
  functionId: z.string().optional(),
  subItems: z.array(z.lazy(() => navMenuItemSchema)).optional(),
});

const menuSettingsFormSchema = z.object({
  navMenu: z.array(navMenuItemSchema),
  footerNavMenu: z.array(navMenuItemSchema).optional(), // Novo menu do rodapé
  availableFunctions: z.array(functionSchema).optional(), // O novo catálogo de funções
});

type MenuSettingsFormValues = z.infer<typeof menuSettingsFormSchema>;

const getFunctionById = (functions: AppFunction[] | undefined, id: string) => {
    if (!functions) return null;
    return functions.find(f => f.id === id);
}

const getUsedFunctionIds = (items: NavMenuItem[]): string[] => {
    let usedIds: string[] = [];
    for (const item of items) {
        if (item.functionId) {
            usedIds.push(item.functionId);
        }
        if (item.subItems) {
            usedIds = [...usedIds, ...getUsedFunctionIds(item.subItems)];
        }
    }
    return usedIds;
};


// --- FUNÇÃO AUXILIAR ---
const getIcon = (iconName?: string | null, fallbackName: keyof typeof icons = 'HelpCircle'): React.ElementType => {
    if (iconName && icons[iconName as keyof typeof icons]) {
        return icons[iconName as keyof typeof icons];
    }
    return icons[fallbackName];
}

// --- COMPONENTE UNIFICADO ---

type SortableMenuItemProps = {
  item: NavMenuItem;
  control: Control<MenuSettingsFormValues>;
  path: string;
  index: number;
  openIconModal: (path: string) => void;
  onRemove: () => void;
};

const SortableMenuItem: FC<SortableMenuItemProps> = ({ item, control, path, index, openIconModal, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const { fields: subItemFields, append, move, remove } = useFieldArray({ control, name: `${path}.${index}.subItems` as any });
    const { getValues } = useFormContext<MenuSettingsFormValues>();
    const functions = getValues('availableFunctions');

    const iconValue = useWatch({
        control,
        name: `${path}.${index}.icon` as any
    });

    const isGroup = item.subItems !== undefined;
    const linkedFunction = item.functionId ? getFunctionById(functions, item.functionId) : null;
    
    const IconComponent = getIcon(iconValue, isGroup ? 'Folder' : 'File');


    const onSubDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = subItemFields.findIndex(i => i.id === active.id);
            const newIndex = subItemFields.findIndex(i => i.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={`p-2 rounded-lg border ${isGroup ? 'bg-muted/50' : 'bg-background'}`}>
            <div className="flex items-center gap-2">
                <div {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
                <Button type="button" variant="ghost" size="icon" onClick={() => openIconModal(`${path}.${index}.icon`)}><IconComponent className="h-5 w-5" /></Button>
                <div className='flex-grow'>
                    <FormField control={control} name={`${path}.${index}.label` as any} render={({ field }) => (<Input {...field} placeholder={isGroup ? "Nome do Grupo" : "Nome do Item"} />)} />
                    {!isGroup && (
                         <div className="text-xs text-muted-foreground mt-1 h-8 pt-2">
                            {linkedFunction ? `Função: ${linkedFunction.name} (${linkedFunction.href})` : 'Este item não está vinculado a uma função.'}
                        </div>
                    )}
                </div>
                <FormField control={control} name={`${path}.${index}.enabled` as any} render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} />)} />
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Isso excluirá permanentemente este item do menu. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onRemove} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            {isGroup && (
                <div className="pl-8 pt-3 mt-2 border-l-2 border-dashed ml-4 space-y-2">
                    <SortableContext items={subItemFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        {subItemFields.map((subItem, subIndex) => (
                            <SortableMenuItem key={subItem.id} item={subItem as any} control={control} path={`${path}.${index}.subItems`} index={subIndex} openIconModal={openIconModal} onRemove={() => remove(subIndex)} />
                        ))}
                    </SortableContext>
                    <AddFunctionToMenuButton path={`${path}.${index}.subItems`} append={append} />
                </div>
            )}
        </div>
    );
};

// --- COMPONENTES ---

const AddFunctionToMenuButton: FC<{ path: string, append: (items: any | any[]) => void }> = ({ append, path }) => {
    const { watch, getValues } = useFormContext<MenuSettingsFormValues>();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

    const functions = watch('availableFunctions');
    const navMenu = watch('navMenu');
    const footerNavMenu = watch('footerNavMenu');
    
    const usedFunctionIds = [...getUsedFunctionIds(navMenu || []), ...getUsedFunctionIds(footerNavMenu || [])];
    const availableFunctions = functions?.filter(f => f.isActive && !usedFunctionIds.includes(f.id)) || [];

    const handleToggleSelection = (funcId: string) => {
        setSelectedFunctions(prev => 
            prev.includes(funcId) ? prev.filter(id => id !== funcId) : [...prev, funcId]
        );
    };

    const handleAddSelected = () => {
        const functionsToAdd = availableFunctions
            .filter(func => selectedFunctions.includes(func.id))
            .map(func => ({
                id: nanoid(6),
                label: func.name,
                icon: 'File', 
                enabled: true,
                functionId: func.id,
            }));

        if (functionsToAdd.length > 0) {
            append(functionsToAdd);
        }
        
        setSelectedFunctions([]);
        setIsDialogOpen(false);
    };
  
    return (
        <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Item/Função
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Funções ao Menu</DialogTitle>
                        <DialogDescription>
                            Selecione uma ou mais funções para adicionar. Funções já utilizadas não são exibidas.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] p-4">
                        <div className="space-y-2">
                            {availableFunctions.length > 0 ? (
                                availableFunctions.map(func => (
                                    <div key={func.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
                                        <Checkbox
                                            id={`func-${func.id}`}
                                            checked={selectedFunctions.includes(func.id)}
                                            onCheckedChange={() => handleToggleSelection(func.id)}
                                        />
                                        <label htmlFor={`func-${func.id}`} className="flex-1 cursor-pointer">
                                            {func.name}
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma função nova disponível para adicionar.</p>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddSelected} disabled={selectedFunctions.length === 0}>
                            Adicionar ({selectedFunctions.length}) Funções
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
  };
  
// O componente SortableSubItem foi removido pois sua funcionalidade foi unificada no SortableMenuItem


// Componente para um grupo principal
const SortableGroup: FC<{ group: NavMenuItem; index: number; control: Control<MenuSettingsFormValues>; openIconModal: (path: string) => void; onRemove: () => void; }> = ({ group, index, control, openIconModal, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: group.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { fields, append, move, remove } = useFieldArray({ control, name: `navMenu.${index}.subItems` as const });
  
  const onSubDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = fields.findIndex(i => i.id === active.id);
        const newIndex = fields.findIndex(i => i.id === over.id);
        if(oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
    }
  }
  
  const IconComponent = getIcon(group.icon, 'Folder');
  
  return (
    <div ref={setNodeRef} style={style} className="p-3 rounded-lg border bg-muted/50 space-y-3">
        {/* Cabeçalho do Grupo */}
        <div className="flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5" /></div>
            <Button type="button" variant="ghost" size="icon" onClick={() => openIconModal(`navMenu.${index}.icon`)}><IconComponent className="h-5 w-5" /></Button>
            <FormField control={control} name={`navMenu.${index}.label`} render={({ field }) => (<FormItem className="flex-grow"><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name={`navMenu.${index}.enabled`} render={({ field }) => (<FormItem><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            <AlertDialog>
                <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Isso excluirá permanentemente este grupo e todos os seus itens. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onRemove} className="bg-destructive hover:bg-destructive/90">Excluir Grupo</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
        {/* Lista de Sub-itens */}
        <div className="pl-8 pt-3 border-l-2 border-dashed ml-4 space-y-2">
            <DndContext sensors={useSensors(useSensor(PointerSensor))} onDragEnd={onSubDragEnd} collisionDetection={closestCenter}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map((subItem, subIndex) => (
                        <SortableMenuItem key={subItem.id} item={subItem as NavMenuItem} control={control} path={`navMenu.${index}.subItems`} index={subIndex} openIconModal={openIconModal} onRemove={() => remove(subIndex)}/>
                    ))}
                </SortableContext>
            </DndContext>
            <AddFunctionToMenuButton path={`navMenu.${index}.subItems`} append={append} />
        </div>
    </div>
  );
}


export default function MenuEditorPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [editingIconPath, setEditingIconPath] = useState<string | null>(null);
  const [iconSearchTerm, setIconSearchTerm] = useState('');

  const form = useForm<MenuSettingsFormValues>({
    resolver: zodResolver(menuSettingsFormSchema),
    defaultValues: { navMenu: [], footerNavMenu: [], availableFunctions: [] },
  });

  const { fields: navMenuFields, move: moveNavMenu, append: appendNavMenu, remove: removeNavMenu } = useFieldArray({ control: form.control, name: "navMenu" });
  const { fields: footerNavMenuFields, move: moveFooterNavMenu, append: appendFooterNavMenu, remove: removeFooterNavMenu } = useFieldArray({ control: form.control, name: "footerNavMenu" });
  const { fields: functions, append: appendFunction, remove: removeFunction, update: updateFunction } = useFieldArray({ control: form.control, name: "availableFunctions" });


  useEffect(() => {
    const menuConfigRef = doc(db, 'siteConfig', 'menu');
    const unsubscribe = onSnapshot(menuConfigRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as MenuSettingsFormValues;
            
            if (!data.availableFunctions) data.availableFunctions = [];
            if (!data.footerNavMenu) data.footerNavMenu = [];

            form.reset(data);
        }
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [form]);

  const sensors = useSensors(useSensor(PointerSensor));

  const findItemContainer = (id: string, items: NavMenuItem[]) => {
        for(const group of items) {
            if (group.id === id) return 'root';
            if (group.subItems?.some(item => item.id === id)) {
                return group.id;
            }
        }
        return null;
    }

  const handleDragEnd = (event: DragEndEvent, menuName: 'navMenu' | 'footerNavMenu') => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const menu = form.getValues(menuName) || [];
    const newMenu = JSON.parse(JSON.stringify(menu));

    const findItemContainer = (id: string, items: NavMenuItem[]): string | null => {
        for (const item of items) {
            if (item.id === id) return 'root';
            if (item.subItems?.some(sub => sub.id === id)) {
                return item.id;
            }
        }
        return null;
    };
    
    const overIsGroup = newMenu.find((item: NavMenuItem) => item.id === over.id)?.subItems !== undefined;

    const findItemAndParent = (id: string, items: NavMenuItem[]): [NavMenuItem | null, NavMenuItem[] | null, number] => {
        for (const item of items) {
            if (item.id === id) {
                return [item, items, items.findIndex(i => i.id === id)];
            }
            if (item.subItems) {
                const subIndex = item.subItems.findIndex(sub => sub.id === id);
                if (subIndex !== -1) {
                    return [item.subItems[subIndex], item.subItems, subIndex];
                }
            }
        }
        return [null, null, -1];
    };
    
    const [movedItem, sourceList, sourceIndex] = findItemAndParent(active.id as string, newMenu);

    if (!movedItem || !sourceList || sourceIndex === -1) return;

    sourceList.splice(sourceIndex, 1);
    
    if (overIsGroup) {
        const destGroup = newMenu.find((item: NavMenuItem) => item.id === over.id);
        if (destGroup && destGroup.subItems) {
            destGroup.subItems.push(movedItem);
        }
    } else {
        const [, destList, destIndex] = findItemAndParent(over.id as string, newMenu);
        if (destList) {
             destList.splice(destIndex, 0, movedItem);
        } else {
            newMenu.push(movedItem);
        }
    }
    
    form.setValue(menuName, newMenu, { shouldDirty: true });
  };

  const clearMenu = () => {
    form.setValue('navMenu', []);
    toast({
        title: "Menu Limpo",
        description: "A estrutura do menu foi removida. Salve para aplicar as alterações.",
    });
  }

  const openIconModal = (path: string) => {
    setEditingIconPath(path);
    setIsIconModalOpen(true);
  };

  const handleSelectIcon = (iconName: string) => {
    if (editingIconPath) {
      form.setValue(editingIconPath as any, iconName, { shouldDirty: true });
      setEditingIconPath(null);
      setIsIconModalOpen(false);
    }
  };

  const addNewFunction = () => {
    appendFunction({
      id: nanoid(8),
      name: 'Nova Função',
      href: '/',
      isActive: true,
    })
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        const result = await syncFunctionsFromFiles();
        if (result.success) {
            toast({
                title: "Sincronização Concluída",
                description: result.message,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Erro na Sincronização",
                description: result.message,
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro Inesperado",
            description: "Ocorreu um erro ao tentar sincronizar as funções.",
        });
    } finally {
        setIsSyncing(false);
    }
  };

  const allIcons = iconCategories.flatMap(category => category.icons);
  const filteredIcons = iconSearchTerm
    ? allIcons.filter(name => name.toLowerCase().includes(iconSearchTerm.toLowerCase()))
    : [];

  const onSubmit = async (data: MenuSettingsFormValues) => {
    setIsSaving(true);
    try {
        await setDoc(doc(db, 'siteConfig', 'menu'), data);
        toast({ title: "Sucesso!", description: "Menu salvo com sucesso." });
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar o menu." });
        console.error(error);
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <Loader2 className="animate-spin h-8 w-8" />;

  return (
    <>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DndContext onDragEnd={(e) => handleDragEnd(e, 'navMenu')}>
            <div className="flex flex-col gap-6">
              <div className='flex justify-between items-center'>
                <h1 className="text-3xl font-bold tracking-tight">Editor do Menu Lateral</h1>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
                </Button>
              </div>
              <Tabs defaultValue="structure">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="structure">Estrutura do Menu</TabsTrigger>
                  <TabsTrigger value="functions">Funções</TabsTrigger>
                </TabsList>
                <TabsContent value="structure">
                    <div className="space-y-8 mt-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Estrutura do Menu</CardTitle>
                          <CardDescription>Arraste para reordenar, adicione grupos ou adicione funções diretamente ao menu.</CardDescription>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" type="button">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Limpar Menu?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá remover todos os itens e grupos da estrutura do menu.
                                  As funções no catálogo não serão afetadas. Deseja continuar?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={clearMenu} className="bg-destructive hover:bg-destructive/90">Sim, Limpar Menu</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <SortableContext items={navMenuFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                          {navMenuFields.map((item, index) => (
                            <SortableMenuItem key={item.id} item={item as any} control={form.control} path="navMenu" index={index} openIconModal={openIconModal} onRemove={() => removeNavMenu(index)} />
                          ))}
                        </SortableContext>
                        <div className="flex items-center gap-2">
                           <Button type="button" variant="outline" size="sm" onClick={() => appendNavMenu({ id: nanoid(6), label: 'Novo Grupo', icon: 'Folder', enabled: true, subItems: [] })}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Grupo
                          </Button>
                          <AddFunctionToMenuButton path="navMenu" append={appendNavMenu} />
                        </div>
                      </CardContent>
                    </Card>

                   <Card>
                    <CardHeader>
                      <CardTitle>Menu do Rodapé</CardTitle>
                      <CardDescription>Itens que aparecerão na parte inferior do menu, acima do botão "Sair".</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DndContext onDragEnd={(e) => handleDragEnd(e, 'footerNavMenu')}>
                        <SortableContext items={footerNavMenuFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                          {footerNavMenuFields.map((item, index) => (
                            <SortableMenuItem key={item.id} item={item as any} control={form.control} path="footerNavMenu" index={index} openIconModal={openIconModal} onRemove={() => removeFooterNavMenu(index)} />
                          ))}
                        </SortableContext>
                      </DndContext>
                      <div className="flex items-center gap-2">
                         <Button type="button" variant="outline" size="sm" onClick={() => appendFooterNavMenu({ id: nanoid(6), label: 'Novo Grupo', icon: 'Folder', enabled: true, subItems: [] })}>
                          <Plus className="mr-2 h-4 w-4" /> Adicionar Grupo
                        </Button>
                        <AddFunctionToMenuButton path="footerNavMenu" append={appendFooterNavMenu} />
                      </div>
                    </CardContent>
                  </Card>

                  </div>
              </TabsContent>
                 <TabsContent value="functions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Catálogo de Funções</CardTitle>
                      <CardDescription>
                        Defina todas as páginas e funcionalidades disponíveis no seu sistema. Itens inativos não aparecerão em lugar nenhum.
                      </CardDescription>
                      <div className="pt-4">
                        <Button type="button" variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                          {isSyncing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Sincronizar Funções do Projeto
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {functions.map((func, index) => (
                            <div key={func.id} className="flex items-center gap-2 p-3 rounded-lg border bg-background">
                              <div className="flex-grow grid grid-cols-2 gap-2">
                                <FormField
                                  control={form.control}
                                  name={`availableFunctions.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Input {...field} placeholder="Nome da Função (ex: Análises)" />
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`availableFunctions.${index}.href`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Input {...field} placeholder="Caminho (ex: /dashboard/analytics)" />
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                               <FormField
                                  control={form.control}
                                  name={`availableFunctions.${index}.isActive`}
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2">
                                       <Switch
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                    </FormItem>
                                  )}
                                />
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Isso excluirá permanentemente esta função. Ela será removida de todos os planos e do menu lateral. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => removeFunction(index)} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>

                        <Button type="button" variant="outline" size="sm" onClick={addNewFunction}>
                          <Plus className="mr-2 h-4 w-4" /> Adicionar Função
                        </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </DndContext>
        </form>
      </FormProvider>
      
      <Dialog open={isIconModalOpen} onOpenChange={setIsIconModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Biblioteca de Ícones</DialogTitle>
            <DialogDescription>
              Navegue pelas categorias ou use a busca para encontrar o ícone ideal para seu item de menu.
            </DialogDescription>
             <div className="pt-4">
                <Input
                    placeholder="Pesquisar em todos os ícones..."
                    value={iconSearchTerm}
                    onChange={(e) => setIconSearchTerm(e.target.value)}
                />
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {iconSearchTerm ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-4">
                  {filteredIcons.map(iconName => {
                    const Icon = icons[iconName];
                    if (!Icon) return null; // Adiciona a verificação de segurança
                    return (
                      <button key={iconName} type="button" onClick={() => handleSelectIcon(iconName)} className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent aspect-square">
                        <Icon className="h-6 w-6 mb-1" />
                        <span className="text-xs text-center truncate w-full">{iconName}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-8 p-4">
                  {iconCategories.map(category => (
                    <div key={category.title}>
                        <h3 className="font-medium text-lg mb-4">{category.title}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                           {category.icons.map(iconName => {
                                const Icon = icons[iconName];
                                if (!Icon) return null; // Adiciona a verificação de segurança
                                return (
                                <button key={iconName} type="button" onClick={() => handleSelectIcon(iconName)} className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent aspect-square">
                                    <Icon className="h-6 w-6 mb-1" />
                                    <span className="text-xs text-center truncate w-full">{iconName}</span>
                                </button>
                                );
                            })}
                        </div>
                    </div>
                  ))}
                </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
} 