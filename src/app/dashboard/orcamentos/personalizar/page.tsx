'use client';

import { memo, useState } from 'react';
import { useSettings, CustomField } from '@/components/settings-provider';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, GripVertical, Check, Pencil, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

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


export default function OrcamentosPersonalizarPage() {
    const { settings, updateSettings, loadingSettings } = useSettings();

    const handleUpdateQuoteFields = (fields: CustomField[]) => {
        updateSettings({ quoteCustomFields: fields });
    };
    
    if (loadingSettings) {
       return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-10 w-32" />
                </div>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Personalizar Opções de Orçamentos</h1>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/orcamentos">Voltar para Orçamentos</Link>
                </Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CustomFieldManager
                    title="Campos para Orçamentos"
                    icon={<FileText className="h-5 w-5 text-primary" />}
                    fields={settings.quoteCustomFields || []}
                    onUpdateFields={handleUpdateQuoteFields}
                />
            </div>
        </div>
    )
} 