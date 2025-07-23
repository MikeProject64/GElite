
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { ServiceOrder } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, LayoutTemplate, Search, Trash2, ArrowLeft, Files, Wrench, Info } from 'lucide-react';

export default function ServicoModelosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [templates, setTemplates] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    const q = query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), where('isTemplate', '==', true));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const templateList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ServiceOrder));
      
      templateList.sort((a, b) => (a.templateName || '').localeCompare(b.templateName || ''));

      setTemplates(templateList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching service templates: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar os modelos de serviço.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => 
        (template.templateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const handleDelete = async () => {
    if (!deletingTemplateId) return;
    try {
      await deleteDoc(doc(db, 'serviceOrders', deletingTemplateId));
      toast({ title: 'Sucesso!', description: 'Modelo excluído.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o modelo.' });
    } finally {
      setDeletingTemplateId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
       <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5"/> Gerenciar Modelos</CardTitle>
            <CardDescription>Use modelos para criar ordens de serviço recorrentes com agilidade.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Como criar um modelo?</AlertTitle>
              <AlertDescription>
                Modelos são criados a partir de Ordens de Serviço já existentes. Abra uma O.S., faça as alterações que deseja e use a opção "Salvar como Modelo" na página de detalhes do serviço.
              </AlertDescription>
            </Alert>
            <div className="mb-4">
                <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    id="search-template"
                    placeholder="Buscar por nome ou título do modelo..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-10">
                    <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum modelo encontrado.</h3>
                    <p className="text-sm text-muted-foreground">
                    Você pode salvar qualquer ordem de serviço como um modelo na página de detalhes dela.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(template => (
                        <Card key={template.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base">{template.templateName}</CardTitle>
                                <CardDescription>{template.serviceType}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">{template.problemDescription}</p>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                               <Button size="sm" className="flex-1" asChild>
                                    <Link href={`/dashboard/servicos/criar?templateId=${template.id}`}>
                                        Usar Modelo
                                    </Link>
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeletingTemplateId(template.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
                Mostrando <strong>{filteredTemplates.length}</strong> de <strong>{templates.length}</strong> modelos.
            </div>
          </CardFooter>
       </Card>

       <AlertDialog open={!!deletingTemplateId} onOpenChange={(open) => !open && setDeletingTemplateId(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente este modelo de ordem de serviço.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletingTemplateId(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Sim, Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
