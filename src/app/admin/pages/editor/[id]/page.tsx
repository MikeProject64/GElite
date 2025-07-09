
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

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, ArrowLeft, ClipboardCopy, Image as ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { CustomPage } from '@/types';


const pageSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  slug: z.string().min(3, { message: 'A URL deve ter pelo menos 3 caracteres.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'URL inválida. Use apenas letras minúsculas, números e hífens.' }),
  content: z.string().optional(),
  isPublic: z.boolean().default(false),
});

type PageFormValues = z.infer<typeof pageSchema>;

export default function PageEditor() {
  const { id: pageId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isNewPage, setIsNewPage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{name: string, url: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: { title: '', slug: '', content: '', isPublic: false },
  });

  const generateSlug = useCallback((title: string) => {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/[^\w-]+/g, '') // Remove caracteres inválidos
      .replace(/--+/g, '-'); // Remove hífens múltiplos
  }, []);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' && isNewPage) {
        form.setValue('slug', generateSlug(value.title || ''));
      }
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
          form.reset(docSnap.data());
        } else {
          toast({ variant: 'destructive', title: 'Erro', description: 'Página não encontrada.' });
          router.push('/admin/pages');
        }
      }).finally(() => setIsLoading(false));
    }
  }, [pageId, form, router, toast]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const storagePath = `customPages/images/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { customMetadata: { userId: user.uid } });
      const downloadURL = await getDownloadURL(storageRef);
      setUploadedImages(prev => [...prev, { name: file.name, url: downloadURL }]);
      toast({ title: 'Sucesso!', description: 'Imagem enviada.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Falha ao enviar a imagem.' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "URL da imagem copiada!" });
  };

  const onSubmit = async (data: PageFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Você não está autenticado.' });
      return;
    }

    try {
      if (isNewPage) {
        await addDoc(collection(db, 'customPages'), {
          ...data,
          userId: user.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        toast({ title: 'Sucesso!', description: 'Página criada.' });
      } else {
        const id = Array.isArray(pageId) ? pageId[0] : pageId;
        const pageRef = doc(db, 'customPages', id);
        await updateDoc(pageRef, {
          ...data,
          updatedAt: Timestamp.now(),
        });
        toast({ title: 'Sucesso!', description: 'Página atualizada.' });
      }
      router.push('/admin/pages');
    } catch (error) {
      console.error("Error saving page: ", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar a página.' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-48" /></div>
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-72 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/pages"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          {isNewPage ? 'Criar Nova Página' : 'Editar Página'}
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título da Página</FormLabel><FormControl><Input placeholder="Ex: Sobre Nossa Empresa" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo (HTML)</FormLabel>
                    <FormControl><Textarea placeholder="<p>Escreva seu conteúdo <b>HTML</b> aqui.</p>" {...field} rows={15} /></FormControl>
                    <FormDescription>Você pode usar tags HTML para formatar o texto. Para adicionar uma imagem, envie abaixo e copie a URL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}/>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>Publicação</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                 <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL (Slug)</FormLabel>
                    <FormControl><Input placeholder="ex: sobre-nos" {...field} /></FormControl>
                    <FormDescription>Esta será a URL da sua página. Use apenas letras minúsculas, números e hífens.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="isPublic" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Página Pública</FormLabel>
                      <FormDescription>Tornar esta página visível para todos.</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}/>
              </CardContent>
               <CardFooter>
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Página
                </Button>
               </CardFooter>
            </Card>
            <Card>
              <CardHeader><CardTitle>Imagens</CardTitle><CardDescription>Envie imagens para usar no conteúdo.</CardDescription></CardHeader>
              <CardContent>
                <div className="grid w-full max-w-sm items-center gap-1.5 mb-4">
                  <Label htmlFor="image-upload">Enviar imagem</Label>
                  <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                  {isUploading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Enviando...</p>}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadedImages.map(image => (
                        <div key={image.url} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                            <span className="truncate pr-2">{image.name}</span>
                             <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyToClipboard(image.url)}>
                                <ClipboardCopy className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
