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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, GripVertical, Check, Pencil, X, ListChecks, ClipboardEdit, Wrench, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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

const statusColors = [
    { name: 'Amarelo', value: '48 96% 58%', class: 'bg-yellow-400' },
    { name: 'Laranja', value: '25 95% 53%', class: 'bg-orange-500' },
    { name: 'Verde', value: '142 69% 51%', class: 'bg-green-500' },
    { name: 'Azul', value: '210 70% 60%', class: 'bg-blue-500' },
    { name: 'Roxo', value: '262 83% 58%', class: 'bg-purple-600' },
    { name: 'Cinza', value: '215 20% 65%', class: 'bg-gray-400' },
];

const CustomStatusManager = () => {
    const { settings, updateSettings } = useSettings();
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState(statusColors[0].value);
    
    const coreStatusIds = ['pending', 'in_progress', 'completed', 'canceled'];

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const statuses = settings.serviceStatuses || [];
        if (over && active.id !== over.id) {
            const oldIndex = statuses.findIndex((status) => status.id === active.id);
            const newIndex = statuses.findIndex((status) => status.id === over.id);
            if(oldIndex > -1 && newIndex > -1) {
                const reordered = arrayMove(statuses, oldIndex, newIndex);
                updateSettings({ serviceStatuses: reordered });
            }
        }
    };

    const handleAddStatus = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newStatusName.trim();
        const currentStatuses = settings.serviceStatuses || [];
        if (trimmedName === '' || currentStatuses.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
            return;
        }
        const newStatus = { id: uuidv4(), name: trimmedName, color: newStatusColor };
        const newStatuses = [...currentStatuses, newStatus];
        updateSettings({ serviceStatuses: newStatuses });
        setNewStatusName('');
    };

    const handleRemoveStatus = (idToRemove: string) => {
        if (coreStatusIds.includes(idToRemove)) return;
        const currentStatuses = settings.serviceStatuses || [];
        const newStatuses = currentStatuses.filter(status => status.id !== idToRemove);
        updateSettings({ serviceStatuses: newStatuses });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="h-5 w-5 text-primary" /> Status de Serviço</CardTitle>
                 <CardDescription>Arraste para reordenar a prioridade dos status.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddStatus} className="flex items-end gap-2 mb-4">
                    <div className="grid gap-1.5 flex-grow">
                        <Label htmlFor="new-status-name">Nome do Status</Label>
                        <Input id="new-status-name" value={newStatusName} onChange={e => setNewStatusName(e.target.value)} placeholder="Ex: Aguardando Peça" />
                    </div>
                     <div className="grid gap-1.5">
                        <Label>Cor</Label>
                        <Select value={newStatusColor} onValueChange={setNewStatusColor}>
                            <SelectTrigger className="w-[60px]">
                                <SelectValue>
                                  <div className="w-4 h-4 rounded-full" style={{backgroundColor: `hsl(${newStatusColor})`}}></div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {statusColors.map(color => (
                                    <SelectItem key={color.value} value={color.value}>
                                        <div className='flex items-center gap-2'>
                                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: `hsl(${color.value})`}}></div>
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
                    {(settings.serviceStatuses || []).length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={(settings.serviceStatuses || []).map(s => s.id)} strategy={verticalListSortingStrategy}>
                                {(settings.serviceStatuses || []).map(status => (
                                    <SortableItem key={status.id} id={status.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${status.color})` }}></div>
                                                <p className="font-medium">{status.name}</p>
                                            </div>
                                            {!coreStatusIds.includes(status.id) && (
                                                <Button size="icon" variant="ghost" onClick={() => handleRemoveStatus(status.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

// Adicionando a definição de tipo para clareza
type ServiceType = { id: string; name: string; color?: string };

function CustomServiceTypeManager({ serviceTypes, onUpdateServiceTypes }: { serviceTypes: ServiceType[], onUpdateServiceTypes: (types: ServiceType[]) => void }) {
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeColor, setNewTypeColor] = useState(statusColors[0].value);
    const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = serviceTypes.findIndex((item) => item.id === active.id);
            const newIndex = serviceTypes.findIndex((item) => item.id === over.id);
            onUpdateServiceTypes(arrayMove(serviceTypes, oldIndex, newIndex));
        }
    };

    const handleAddType = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalized = newTypeName.trim().toLowerCase();
        if (!normalized) return;
        if (serviceTypes.some(t => t.name.trim().toLowerCase() === normalized)) {
            toast({ variant: "destructive", title: "Erro", description: "Já existe um tipo de serviço com esse nome." });
            return;
        }
        try {
            await onUpdateServiceTypes([...serviceTypes, { id: uuidv4(), name: newTypeName.trim(), color: newTypeColor }]);
            setNewTypeName('');
            setNewTypeColor(statusColors[0].value);
            toast({ title: 'Tipo adicionado', description: 'Tipo de serviço cadastrado com sucesso.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível adicionar o tipo.', variant: 'destructive' });
        }
    };

    const handleRemoveType = async (id: string) => {
        try {
            await onUpdateServiceTypes(serviceTypes.filter(t => t.id !== id));
            toast({ title: 'Tipo removido', description: 'Tipo de serviço removido com sucesso.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível remover o tipo.', variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Wrench className="h-5 w-5 text-primary" /> Tipos de Serviço</CardTitle>
                <CardDescription>Adicione ou remova os tipos de serviço. Arraste para reordenar.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddType} className="flex items-end gap-2 mb-4" aria-label="Adicionar novo tipo de serviço">
                    <div className='flex-grow grid gap-1.5'>
                        <Label>Nome do Tipo</Label>
                        <Input
                            placeholder="Ex: Instalação, Manutenção..."
                            value={newTypeName}
                            onChange={e => setNewTypeName(e.target.value)}
                        />
                    </div>
                    <div className='grid gap-1.5'>
                        <Label>Cor</Label>
                        <Select value={newTypeColor} onValueChange={setNewTypeColor}>
                            <SelectTrigger className="w-[60px]">
                                <SelectValue>
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${newTypeColor})` }}></div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {statusColors.map(color => (
                                    <SelectItem key={color.value} value={color.value}>
                                        <div className='flex items-center gap-2'>
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${color.value})` }}></div>
                                            {color.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" size="icon" disabled={!newTypeName.trim()}>
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </form>

                <div className="space-y-2">
                    {serviceTypes.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={serviceTypes.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {serviceTypes.map((tipo) => (
                                    <SortableItem key={tipo.id} id={tipo.id}>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${tipo.color || statusColors[0].value})` }}></div>
                                                <p className="font-medium">{tipo.name}</p>
                                            </div>
                                            <Button size="icon" variant="ghost" onClick={() => handleRemoveType(tipo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </SortableItem>
                                ))}
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <p className="text-muted-foreground text-sm text-center py-4">Nenhum tipo de serviço adicionado.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function ServicosPersonalizarPage() {
    const { settings, updateSettings, loadingSettings } = useSettings();

    const handleUpdateServiceOrderFields = (fields: CustomField[]) => {
        updateSettings({ serviceOrderCustomFields: fields });
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Personalização de Serviços
                </CardTitle>
                <CardDescription>
                    Ajuste os campos, tipos e status para adaptar o sistema ao seu fluxo de trabalho.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <CustomFieldManager
                        title="Campos para Ordens de Serviço"
                        icon={<ClipboardEdit className="h-5 w-5 text-primary" />}
                        fields={settings.serviceOrderCustomFields || []}
                        onUpdateFields={handleUpdateServiceOrderFields}
                    />
                    <CustomServiceTypeManager
                        serviceTypes={settings.serviceTypes || []}
                        onUpdateServiceTypes={types => updateSettings({ serviceTypes: types })}
                    />
                    <div className="md:col-span-2 lg:col-span-1">
                        <CustomStatusManager />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
} 