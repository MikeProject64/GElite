
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import type { UserSettings } from '@/types';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageUploaderProps {
  title: string;
  description: string;
  imageUrl?: string;
  fieldName: string;
  onUpload: (fieldName: string, file: File, index?: number) => void;
  isUploading: boolean;
  imageClassName?: string;
  index?: number;
}

function ImageUploader({ title, description, imageUrl, fieldName, onUpload, isUploading, imageClassName, index }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    if (file) {
      onUpload(fieldName, file, index);
      setFile(null); // Clear file after starting upload
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <Image src={imageUrl} alt={title} width={200} height={128} className={imageClassName || "object-cover h-full w-full"} />
          ) : (
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="w-full grid gap-2">
          <Label htmlFor={`file-${fieldName}-${index}`} className="sr-only">Choose file</Label>
          <Input id={`file-${fieldName}-${index}`} type="file" accept="image/*" onChange={handleFileChange} className="text-xs" />
          <Button onClick={handleUploadClick} disabled={!file || isUploading} size="sm">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminHomePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as UserSettings);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async (fieldName: string, file: File, index?: number) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar autenticado.' });
        return;
    }
    const uniqueFieldName = typeof index === 'number' ? `${fieldName}-${index}` : fieldName;
    setUploading(prev => ({ ...prev, [uniqueFieldName]: true }));

    try {
      const storagePath = `siteConfig/${fieldName}/${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, storagePath);
      const metadata = { customMetadata: { userId: user.uid } };
      await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(storageRef);

      const settingsRef = doc(db, 'siteConfig', 'main');

      if (typeof index === 'number') { // Handle array update for gallery
        const docSnap = await getDoc(settingsRef);
        const currentImages = docSnap.data()?.landingPageImages?.galleryImages || [];
        const newImages = [...currentImages];
        while (newImages.length <= index) {
            newImages.push(''); 
        }
        newImages[index] = downloadURL;
        await updateDoc(settingsRef, { 'landingPageImages.galleryImages': newImages });
      } else { // Handle single field update
        await updateDoc(settingsRef, { [`landingPageImages.${fieldName}`]: downloadURL });
      }

      toast({ title: 'Sucesso!', description: 'Imagem atualizada com sucesso.' });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao enviar a imagem.' });
    } finally {
      setUploading(prev => ({ ...prev, [uniqueFieldName]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  const landingImages = settings?.landingPageImages;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gerenciar Imagens da Página Inicial</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Seção Hero</CardTitle>
          <CardDescription>A imagem principal que aparece no topo da página.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <ImageUploader
              title="Imagem Hero"
              description="Dimensões recomendadas: 600x550"
              imageUrl={landingImages?.heroImage}
              fieldName="heroImage"
              onUpload={handleUpload}
              isUploading={uploading['heroImage']}
              imageClassName="object-contain"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção "Como Funciona"</CardTitle>
          <CardDescription>As três imagens que ilustram as funcionalidades.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
          <ImageUploader
            title="Funcionalidade 1"
            description="Dimensões: 550x450"
            imageUrl={landingImages?.feature1Image}
            fieldName="feature1Image"
            onUpload={handleUpload}
            isUploading={uploading['feature1Image']}
          />
          <ImageUploader
            title="Funcionalidade 2"
            description="Dimensões: 550x450"
            imageUrl={landingImages?.feature2Image}
            fieldName="feature2Image"
            onUpload={handleUpload}
            isUploading={uploading['feature2Image']}
          />
          <ImageUploader
            title="Funcionalidade 3"
            description="Dimensões: 550x450"
            imageUrl={landingImages?.feature3Image}
            fieldName="feature3Image"
            onUpload={handleUpload}
            isUploading={uploading['feature3Image']}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seção de Depoimentos</CardTitle>
          <CardDescription>As três imagens dos avatares dos clientes.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
          <ImageUploader
            title="Depoimento 1"
            description="Dimensões: 100x100"
            imageUrl={landingImages?.testimonial1Image}
            fieldName="testimonial1Image"
            onUpload={handleUpload}
            isUploading={uploading['testimonial1Image']}
          />
          <ImageUploader
            title="Depoimento 2"
            description="Dimensões: 100x100"
            imageUrl={landingImages?.testimonial2Image}
            fieldName="testimonial2Image"
            onUpload={handleUpload}
            isUploading={uploading['testimonial2Image']}
          />
          <ImageUploader
            title="Depoimento 3"
            description="Dimensões: 100x100"
            imageUrl={landingImages?.testimonial3Image}
            fieldName="testimonial3Image"
            onUpload={handleUpload}
            isUploading={uploading['testimonial3Image']}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Seção de Galeria</CardTitle>
          <CardDescription>As 9 imagens exibidas na galeria.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 9 }).map((_, index) => {
            const imageUrl = landingImages?.galleryImages?.[index];
            return (
              <ImageUploader
                key={index}
                title={`Imagem ${index + 1}`}
                description="Dimensões: 600x400"
                imageUrl={imageUrl}
                fieldName="galleryImages"
                index={index}
                onUpload={handleUpload}
                isUploading={uploading[`galleryImages-${index}`]}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
