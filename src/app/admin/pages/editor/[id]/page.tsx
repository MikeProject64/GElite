
'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import Image from 'next/image';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, useDraggable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, ArrowLeft, GripVertical, Trash2, Heading1, Heading2, Pilcrow, Image as ImageIcon, PlusCircle } from 'lucide-react';
import { CustomPage, PageBlock, PageBlockType } from '@/types';
import { Label } from '@/components/ui/label';

// --- Zod Schema ---
const pageSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  slug: z.string().min(3, { message: 'A URL deve ter pelo menos 3 caracteres.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'URL inválida. Use apenas letras minúsculas, números e hífens.' }),
  isPublic: z.boolean().default(false),
});
type PageFormValues = z.infer<typeof pageSchema>;

const editorElements = [
    { type: 'title' as PageBlockType, icon: <Heading1 />, label: 'Título' },
    { type: 'subtitle' as PageBlockType, icon: <Heading2 />, label: 'Subtítulo' },
    { type: 'text' as PageBlockType, icon: <Pilcrow />, label: 'Texto' },
    { type: 'image' as PageBlockType, icon: <ImageIcon />, label: 'Imagem' },
];

// --- Drag-and-Drop Components ---

function DraggableElement({ type, icon, label }: { type: PageBlockType, icon: React.ReactNode, label: string }) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: `draggable-${type}` });
    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className="flex items-center gap-2 p-2 bg-muted rounded-md cursor-grab active:cursor-grabbing">
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}

function SortableBlock({ block, selectedBlockId, setSelectedBlockId, removeBlock }: { block: PageBlock, selectedBlockId: string | null, setSelectedBlockId: (id: string | null) => void, removeBlock: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const isSelected = block.id === selectedBlockId;

    const renderBlockContent = () => {
        switch (block.type) {
            case 'title': return <h1 className="text-3xl font-bold">{block.content.text || 'Título Principal'}</h1>;
            case 'subtitle': return <h2 className="text-2xl font-semibold">{block.content.text || 'Subtítulo'}</h2>;
            case 'text': return <p className="leading-relaxed">{block.content.text || 'Parágrafo de texto.'}</p>;
            case 'image': return <Image src={block.content.src || 'https://placehold.co/600x400.png'} alt={block.content.alt || 'Imagem'} width={600} height={400} className="w-full h-auto rounded-md bg-muted" />;
        }
    };

    return (
        <div ref={setNodeRef} style={style} className={`relative p-4 rounded-md group ${isSelected ? 'ring-2 ring-primary' : 'bg-card border'}`} onClick={() => setSelectedBlockId(block.id)}>
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 cursor-grab" {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {renderBlockContent()}
        </div>
    );
}

// --- Main Page Editor Component ---

export default function PageEditor() {
    const { id: pageId } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [blocks, setBlocks] = useState<PageBlock[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewPage, setIsNewPage] = useState(false);
    
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const form = useForm<PageFormValues>({
        resolver: zodResolver(pageSchema),
        defaultValues: { title: '', slug: '', isPublic: false },
    });

    const generateSlug = useCallback((title: string) => {
        return title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
    }, []);
    
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
          if (name === 'title' && isNewPage) form.setValue('slug', generateSlug(value.title || ''));
        });
        return () => subscription.unsubscribe();
    }, [form, generateSlug, isNewPage]);
    
    useEffect(() => {
        const id = Array.isArray(pageId) ? pageId[0] : pageId;
        if (id === 'new') {
          setIsNewPage(true);
          setIsLoading(false);
        } else {
          setIsNewPage(false);
          const pageRef = doc(db, 'customPages', id);
          getDoc(pageRef).then(docSnap => {
            if (docSnap.exists()) {
              const data = docSnap.data() as CustomPage;
              form.reset({ title: data.title, slug: data.slug, isPublic: data.isPublic });
              setBlocks(Array.isArray(data.content) ? data.content : []);
            } else {
              toast({ variant: 'destructive', title: 'Erro', description: 'Página não encontrada.' });
              router.push('/admin/pages');
            }
          }).finally(() => setIsLoading(false));
        }
    }, [pageId, form, router, toast]);

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, blockId: string) => {
        if (!e.target.files?.length || !user) return;
        const file = e.target.files[0];
        toast({ description: "Enviando imagem..." });
        try {
            const storageRef = ref(storage, `customPages/images/${uuidv4()}-${file.name}`);
            await uploadBytes(storageRef, file, { customMetadata: { userId: user.uid } });
            const downloadURL = await getDownloadURL(storageRef);
            updateBlock(blockId, { src: downloadURL, alt: file.name });
            toast({ title: 'Sucesso!', description: 'Imagem enviada.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Falha ao enviar a imagem.' });
        } finally {
            e.target.value = '';
        }
    };

    const updateBlock = (blockId: string, newContent: Partial<PageBlock['content']>) => {
        setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content: { ...b.content, ...newContent } } : b));
    };

    const removeBlock = (blockId: string) => {
        setBlocks(prev => prev.filter(b => b.id !== blockId));
        if(selectedBlockId === blockId) setSelectedBlockId(null);
    }
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
    
        const activeId = active.id.toString();
        const overId = over.id.toString();
    
        // Handle dropping a new element from the sidebar
        if (activeId.startsWith('draggable-') && overId === 'canvas') {
          const type = activeId.replace('draggable-', '') as PageBlockType;
          const newBlock: PageBlock = {
            id: uuidv4(),
            type,
            content: { text: '' }
          };
          if (type === 'image') {
            newBlock.content = { src: 'https://placehold.co/600x400.png', alt: 'Placeholder' };
          }
          setBlocks(prev => [...prev, newBlock]);
          setSelectedBlockId(newBlock.id);
          return;
        }
    
        // Handle reordering existing elements
        if (!activeId.startsWith('draggable-') && !overId.startsWith('draggable-') && activeId !== overId) {
            const oldIndex = blocks.findIndex(b => b.id === activeId);
            const newIndex = blocks.findIndex(b => b.id === overId);
            setBlocks(prev => arrayMove(prev, oldIndex, newIndex));
        }
    };

    const onSubmit = async (data: PageFormValues) => {
        if (!user) return;
        try {
          const payload = { ...data, content: blocks };
          if (isNewPage) {
            await addDoc(collection(db, 'customPages'), { ...payload, userId: user.uid, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
            toast({ title: 'Sucesso!', description: 'Página criada.' });
          } else {
            const id = Array.isArray(pageId) ? pageId[0] : pageId;
            await updateDoc(doc(db, 'customPages', id), { ...payload, updatedAt: Timestamp.now() });
            toast({ title: 'Sucesso!', description: 'Página atualizada.' });
          }
          router.push('/admin/pages');
        } catch (error) {
          console.error("Error saving page: ", error);
          toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar a página.' });
        }
    };

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-screen">
                <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild><Link href="/admin/pages"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link></Button>
                        <h1 className="text-xl font-semibold tracking-tight">{isNewPage ? 'Criar Nova Página' : 'Editar Página'}</h1>
                    </div>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Página
                    </Button>
                </header>

                <div className="grid lg:grid-cols-12 flex-1 overflow-hidden">
                    {/* Elements Sidebar */}
                    <aside className="lg:col-span-2 bg-card border-r p-4 space-y-4 overflow-y-auto">
                        <h2 className="font-semibold">Elementos</h2>
                        {editorElements.map(el => <DraggableElement key={el.type} {...el} />)}
                    </aside>

                    {/* Editor Canvas */}
                    <main id="canvas" className="lg:col-span-7 bg-muted/50 p-4 md:p-8 overflow-y-auto">
                        <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            <div className="max-w-3xl mx-auto space-y-4">
                                {blocks.length > 0 ? (
                                    blocks.map(block => (
                                        <SortableBlock key={block.id} block={block} selectedBlockId={selectedBlockId} setSelectedBlockId={setSelectedBlockId} removeBlock={removeBlock} />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                        <PlusCircle className="h-12 w-12 mb-4" />
                                        <p>Arraste um elemento da barra lateral para começar a construir sua página.</p>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </main>

                    {/* Properties Panel */}
                    <aside className="lg:col-span-3 bg-card border-l p-4 overflow-y-auto">
                        <h2 className="font-semibold mb-4">Propriedades</h2>
                        {selectedBlock ? (
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs uppercase text-muted-foreground">Tipo</Label>
                                    <p className="font-medium capitalize">{selectedBlock.type}</p>
                                </div>
                                {(selectedBlock.type === 'title' || selectedBlock.type === 'subtitle' || selectedBlock.type === 'text') && (
                                    <div>
                                        <Label htmlFor="text-content">Conteúdo</Label>
                                        <Textarea id="text-content" value={selectedBlock.content.text} onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })} rows={5} />
                                    </div>
                                )}
                                {selectedBlock.type === 'image' && (
                                    <div className="space-y-2">
                                        <div>
                                            <Label htmlFor="image-src">URL da Imagem</Label>
                                            <Input id="image-src" value={selectedBlock.content.src} onChange={(e) => updateBlock(selectedBlock.id, { src: e.target.value })} />
                                        </div>
                                         <div>
                                            <Label>Enviar Nova Imagem</Label>
                                            <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, selectedBlock.id)} />
                                        </div>
                                        <div>
                                            <Label htmlFor="image-alt">Texto Alternativo</Label>
                                            <Input id="image-alt" value={selectedBlock.content.alt} onChange={(e) => updateBlock(selectedBlock.id, { alt: e.target.value })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                           <div className="space-y-4">
                                <Form {...form}>
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>Título da Página</FormLabel><FormControl><Input placeholder="Sobre Nós" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="slug" render={({ field }) => (
                                        <FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="sobre-nos" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="isPublic" render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                        <FormLabel>Página Pública</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                      </FormItem>
                                    )}/>
                                </Form>
                           </div>
                        )}
                    </aside>
                </div>
            </div>
        </DndContext>
    );
}
