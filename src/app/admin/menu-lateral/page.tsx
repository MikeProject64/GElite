'use client';

import { useEffect, useState, FC } from 'react';
import { useForm, useFieldArray, Control } from 'react-hook-form';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { nanoid } from 'nanoid';

// --- TIPOS E SCHEMAS ---

const iconList = Object.keys(icons) as (keyof typeof icons)[];

type NavMenuItem = {
  id: string;
  label: string;
  href?: string;
  icon: string;
  enabled: boolean;
  subItems?: NavMenuItem[];
};

const navMenuItemSchema: z.ZodType<NavMenuItem> = z.object({
  id: z.string(),
  label: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  href: z.string().optional(),
  icon: z.string(),
  enabled: z.boolean(),
  subItems: z.array(z.lazy(() => navMenuItemSchema)).optional(),
});

const menuSettingsFormSchema = z.object({
  navMenu: z.array(navMenuItemSchema),
  systemNavItems: z.array(navMenuItemSchema),
});

type MenuSettingsFormValues = z.infer<typeof menuSettingsFormSchema>;

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
    
    const IconComponent = getIcon(item.icon, item.subItems ? 'Folder' : 'File');
    const isGroup = item.subItems !== undefined;

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
                    {!isGroup && <FormField control={control} name={`${path}.${index}.href` as any} render={({ field }) => (<Input {...field} placeholder="Caminho (ex: /dashboard/pagina)" className="text-xs text-muted-foreground mt-1 h-8" />)} />}
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
                    <DndContext sensors={useSensors(useSensor(PointerSensor))} onDragEnd={onSubDragEnd}>
                        <SortableContext items={subItemFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            {subItemFields.map((subItem, subIndex) => (
                                <SortableMenuItem key={subItem.id} item={subItem as any} control={control} path={`${path}.${index}.subItems`} index={subIndex} openIconModal={openIconModal} onRemove={() => remove(subIndex)} />
                            ))}
                        </SortableContext>
                    </DndContext>
                    <Button type="button" variant="ghost" size="sm" onClick={() => append({ id: nanoid(6), label: 'Novo Item', icon: 'File', enabled: true, href: '#' })}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Item
                    </Button>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTES ---

// Componente para um sub-item (dentro de um grupo)
const SortableSubItem: FC<{ item: NavMenuItem; control: Control<MenuSettingsFormValues>; path: string; openIconModal: (path: string) => void; onRemove: () => void; }> = ({ item, control, path, openIconModal, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const IconComponent = getIcon(item.icon, 'File');

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-background rounded-lg">
        <div {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-5 w-5 text-muted-foreground" /></div>
        <Button type="button" variant="ghost" size="icon" onClick={() => openIconModal(`${path}.icon`)}><IconComponent className="h-5 w-5" /></Button>
        <div className='flex-grow'>
            <FormField control={control} name={`${path}.label`} render={({ field }) => (<FormItem><FormControl><Input {...field} placeholder="Nome do Item" /></FormControl></FormItem>)} />
            <FormField control={control} name={`${path}.href`} render={({ field }) => (<FormItem><FormControl><Input {...field} placeholder="Caminho (ex: /dashboard/pagina)" className="text-xs text-muted-foreground mt-1 h-8" /></FormControl></FormItem>)} />
        </div>
        <FormField control={control} name={`${path}.enabled`} render={({ field }) => (<FormItem><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
        <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Isso excluirá permanentemente este item do menu. Deseja continuar?</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onRemove} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

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
                        <SortableSubItem key={subItem.id} item={subItem as NavMenuItem} control={control} path={`navMenu.${index}.subItems.${subIndex}`} openIconModal={openIconModal} onRemove={() => remove(subIndex)}/>
                    ))}
                </SortableContext>
            </DndContext>
            <Button type="button" variant="ghost" size="sm" onClick={() => append({ id: nanoid(6), label: 'Novo Item', icon: 'File', enabled: true, href: '#' })}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Item
            </Button>
        </div>
    </div>
  );
}


export default function MenuEditorPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [editingIconPath, setEditingIconPath] = useState<string | null>(null);
  const [iconSearchTerm, setIconSearchTerm] = useState('');

  const form = useForm<MenuSettingsFormValues>({
    resolver: zodResolver(menuSettingsFormSchema),
    defaultValues: { navMenu: [], systemNavItems: [] },
  });

  const { fields: navMenuFields, move: moveNavMenu, append: appendNavMenu, remove: removeNavMenu } = useFieldArray({ control: form.control, name: "navMenu" });
  const { fields: systemNavFields, move: moveSystemNav, append: appendSystemNav, remove: removeSystemNav } = useFieldArray({ control: form.control, name: "systemNavItems" });

  useEffect(() => {
    const menuConfigRef = doc(db, 'siteConfig', 'menu');
    const unsubscribe = onSnapshot(menuConfigRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Verifica se já existe o item 'Conta e Segurança'
            const exists = data.navMenu?.some((item: any) => item.href === '/admin/conta-e-seguranca');
            if (!exists) {
              data.navMenu = [
                ...data.navMenu,
                {
                  id: nanoid(6),
                  label: 'Conta e Segurança',
                  href: '/admin/conta-e-seguranca',
                  icon: 'Shield',
                  enabled: true,
                },
              ];
            }
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

  const handleDragEnd = (event: DragEndEvent, fields: any[], move: (from: number, to: number) => void) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        
        const activeContainer = findItemContainer(active.id as string, fields);
        const overContainer = findItemContainer(over.id as string, fields);
        
        if (!activeContainer || !overContainer) return;
        
        // Cenário 1: Reordenando grupos na raiz
        if (activeContainer === 'root' && overContainer === 'root') {
             const oldIndex = fields.findIndex(g => g.id === active.id);
             const newIndex = fields.findIndex(g => g.id === over.id);
             if (oldIndex !== -1 && newIndex !== -1) move(oldIndex, newIndex);
             return;
        }

        // Cenário 2: Movendo item entre grupos
        if (activeContainer !== overContainer && activeContainer !== 'root') {
            const newMenu = JSON.parse(JSON.stringify(fields));
            
            const sourceGroupIndex = newMenu.findIndex((g:NavMenuItem) => g.id === activeContainer);
            const sourceItemIndex = newMenu[sourceGroupIndex].subItems.findIndex((i:NavMenuItem) => i.id === active.id);
            const [movedItem] = newMenu[sourceGroupIndex].subItems.splice(sourceItemIndex, 1);
            
            let destGroupIndex = newMenu.findIndex((g:NavMenuItem) => g.id === overContainer);
            if (destGroupIndex === -1 && findItemContainer(over.id as string, newMenu) !== 'root') { // Dropped on an item
                 destGroupIndex = newMenu.findIndex((g:NavMenuItem) => g.id === findItemContainer(over.id as string, newMenu));
            }
            
            if(destGroupIndex !== -1) {
                let destItemIndex = newMenu[destGroupIndex].subItems?.findIndex((i:NavMenuItem) => i.id === over.id) ?? -1;
                if(destItemIndex !== -1) { // Soltou sobre um item
                    newMenu[destGroupIndex].subItems.splice(destItemIndex, 0, movedItem);
                } else { // Soltou sobre um grupo
                    newMenu[destGroupIndex].subItems.push(movedItem);
                }
            }
            // replace(newMenu); // This line was removed as per the new_code, as the form.replace is no longer needed here.
        }
    };
  
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

  const filteredIcons = iconList.filter(name => name.toLowerCase().includes(iconSearchTerm.toLowerCase()));

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
      <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e, navMenuFields, moveNavMenu)} collisionDetection={closestCenter}>
        <div className="flex flex-col gap-6">
          <div className='flex justify-between items-center'>
            <h1 className="text-3xl font-bold tracking-tight">Editor do Menu Lateral</h1>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
            </Button>
          </div>
          <Form {...form}>
            <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Menu Principal</CardTitle>
                  <CardDescription>Arraste para reordenar, edite, troque ícones e ative/desative itens.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e, navMenuFields, moveNavMenu)} collisionDetection={closestCenter}>
                    <SortableContext items={navMenuFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      {navMenuFields.map((item, index) => (
                        <SortableMenuItem key={item.id} item={item as any} control={form.control} path="navMenu" index={index} openIconModal={openIconModal} onRemove={() => removeNavMenu(index)} />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendNavMenu({ id: nanoid(6), label: 'Novo Grupo', icon: 'Folder', enabled: true, subItems: [] })}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Grupo
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Menu do Sistema</CardTitle>
                  <CardDescription>Itens do sistema que aparecem para todos os usuários, independente do plano.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DndContext sensors={sensors} onDragEnd={(e) => handleDragEnd(e, systemNavFields, moveSystemNav)} collisionDetection={closestCenter}>
                    <SortableContext items={systemNavFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      {systemNavFields.map((item, index) => (
                        <SortableMenuItem key={item.id} item={item as any} control={form.control} path="systemNavItems" index={index} openIconModal={openIconModal} onRemove={() => removeSystemNav(index)} />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <Button type="button" variant="outline" size="sm" onClick={() => appendSystemNav({ id: nanoid(6), label: 'Novo Grupo Sistema', icon: 'Folder', enabled: true, subItems: [] })}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Grupo no Sistema
                  </Button>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </DndContext>
      
      <Dialog open={isIconModalOpen} onOpenChange={setIsIconModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Selecione um Ícone</DialogTitle>
             <div className="pt-4">
                <Input
                    placeholder="Pesquisar ícones..."
                    value={iconSearchTerm}
                    onChange={(e) => setIconSearchTerm(e.target.value)}
                />
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-4">
              {filteredIcons.map(iconName => {
                const Icon = icons[iconName];
                return (
                  <button key={iconName} type="button" onClick={() => handleSelectIcon(iconName)} className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent aspect-square">
                    <Icon className="h-6 w-6 mb-1" />
                    <span className="text-xs text-center truncate w-full">{iconName}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
} 