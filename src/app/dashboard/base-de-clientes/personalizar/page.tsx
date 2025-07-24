'use client';

import { memo, useState } from 'react';
import { useSettings, CustomField, Tag } from '@/components/settings-provider';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, GripVertical, Check, Pencil, X, Users, Tag as TagIcon } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PagePermissionGuard } from '@/components/security/page-permission-guard';

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
    const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'currency'>('text');
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [editingFieldName, setEditingFieldName] = useState('');

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

    const handleStartEditing = (field: CustomField) => {
      setEditingFieldId(field.id);
      setEditingFieldName(field.name);
    };

    const handleCancelEditing = () => {
      setEditingFieldId(null);
      setEditingFieldName('');
    };

    const handleSaveEdit = () => {
      if (!editingFieldId || editingFieldName.trim() === '') return;
      const updatedFields = fields.map(field => 
        field.id === editingFieldId ? { ...field, name: editingFieldName.trim() } : field
      );
      onUpdateFields(updatedFields);
      handleCancelEditing();
    };

    return (
        <Card>
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
                                <SelectItem value="currency">Moeda (R$)</SelectItem>
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
                                          {editingFieldId === field.id ? (
                                            <div className="flex w-full items-center gap-2">
                                              <Input value={editingFieldName} onChange={(e) => setEditingFieldName(e.target.value)} className="h-8" />
                                              <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 text-green-500"><Check className="h-4 w-4"/></Button>
                                              <Button size="icon" variant="ghost" onClick={handleCancelEditing} className="h-8 w-8"><X className="h-4 w-4"/></Button>
                                            </div>
                                          ) : (
                                            <>
                                              <div>
                                                  <p className="font-medium">{field.name}</p>
                                                  <p className="text-xs text-muted-foreground capitalize">{field.type === 'currency' ? 'Moeda' : field.type}</p>
                                              </div>
                                              <div className="flex items-center">
                                                <Button size="icon" variant="ghost" onClick={() => handleStartEditing(field)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleRemoveField(field.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                              </div>
                                            </>
                                          )}
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
        <Card>
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


export default function ClientesPersonalizarPage() {
    const { settings, updateSettings, loadingSettings } = useSettings();

    const handleUpdateCustomerFields = (fields: CustomField[]) => {
        updateSettings({ customerCustomFields: fields });
    };

    const handleUpdateTags = (tags: Tag[]) => {
        updateSettings({ tags: tags });
    };

    if (loadingSettings) {
       return (
            <div className="flex flex-col gap-4">
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <PagePermissionGuard functionId="clientes_personalizar">
            <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <CustomTagManager
                    tags={settings.tags || []}
                    onUpdateTags={handleUpdateTags}
                />
                <CustomFieldManager
                    title="Campos para Clientes"
                    icon={<Users className="h-5 w-5 text-primary" />}
                    fields={settings.customerCustomFields || []}
                    onUpdateFields={handleUpdateCustomerFields}
                />
            </div>
        </PagePermissionGuard>
    )
} 