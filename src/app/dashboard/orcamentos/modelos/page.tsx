
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Quote } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, LayoutTemplate, Search, Trash2, Pencil, ArrowLeft, Files } from 'lucide-react';

export default function OrcamentoModelosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [templates, setTemplates] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    
    const q = query(collection(db, 'quotes'), where('userId', '==', user.uid), where('isTemplate', '==', true), orderBy('templateName', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const templateList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Quote));
      setTemplates(templateList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching templates: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar os modelos de orçamento.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => 
        (template.templateName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const handleDelete = async () => {
    if (!deletingTemplateId) return;
    try {
      await deleteDoc(doc(db, 'quotes', deletingTemplateId));
      toast({ title: 'Sucesso!', description: 'Modelo excluído.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o modelo.' });
    } finally {
      setDeletingTemplateId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className='flex items-center gap-4'>
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/dashboard/orcamentos"><ArrowLeft className="h-4 w-4" /><span className="sr-only">Voltar</span></Link>
            </Button>
            <h1 className="text-lg font-semibold md:text-2xl">Modelos de Orçamento</h1>
        </div>
        <Button size="sm" className="h-8 gap-1" asChild>
            <Link href="/dashboard/orcamentos/criar">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Novo Orçamento
                </span>
            </Link>
        </Button>
      </div>

       <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LayoutTemplate className="h-5 w-5"/> Gerenciar Modelos</CardTitle>
            <CardDescription>Use modelos para criar orçamentos recorrentes com agilidade. Salve um orçamento como modelo na página de detalhes.</CardDescription>
          </CardHeader>
          <CardContent>
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
                    <Files className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum modelo encontrado.</h3>
                    <p className="text-sm text-muted-foreground">
                    Você pode salvar qualquer orçamento como um modelo na página de detalhes dele.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(template => (
                        <Card key={template.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base">{template.templateName}</CardTitle>
                                <CardDescription>{template.title}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">{template.description}</p>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                               <Button size="sm" className="flex-1" asChild>
                                    <Link href={`/dashboard/orcamentos/criar?templateId=${template.id}`}>
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
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente este modelo de orçamento.
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
