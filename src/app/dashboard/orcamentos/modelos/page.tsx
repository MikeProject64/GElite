
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
import { Loader2, PlusCircle, LayoutTemplate, Search, Trash2, Pencil, ArrowLeft, Files, MoreHorizontal, Plus, FileText, Info } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
    
    const q = query(collection(db, 'quotes'), where('userId', '==', user.uid), where('isTemplate', '==', true));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const templateList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Quote));

      templateList.sort((a, b) => (a.templateName || '').localeCompare(b.templateName || ''));

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

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como criar um Modelo de Orçamento?</AlertTitle>
        <AlertDescription>
          Para criar um novo modelo, primeiro <Link href="/dashboard/orcamentos" className="font-semibold text-primary hover:underline">crie um orçamento</Link> com os detalhes que deseja salvar. Em seguida, na página de detalhes do orçamento, utilize a opção "Salvar como modelo".
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Modelos de Orçamento</CardTitle>
          <CardDescription>
            Gerencie seus modelos de orçamento para agilizar a criação de novas propostas.
          </CardDescription>
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
          {filteredTemplates.length === 0 ? (
              <div className="text-center py-10">
                  <Files className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Nenhum modelo encontrado.</h3>
                  <p className="text-sm text-muted-foreground">
                  Você pode salvar qualquer orçamento como um modelo na página de detalhes dele.
                  </p>
              </div>
          ) : (
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Nome do Modelo</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Ações</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredTemplates.map(template => (
                          <TableRow key={template.id}>
                              <TableCell>{template.templateName}</TableCell>
                              <TableCell>{template.title}</TableCell>
                              <TableCell>{template.description}</TableCell>
                              <TableCell>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button
                                              variant="ghost"
                                              className="h-8 w-8 p-0"
                                          >
                                              <span className="sr-only">Abrir menu</span>
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                          <DropdownMenuItem onClick={() => router.push(`/dashboard/orcamentos/criar?templateId=${template.id}`)}>
                                              Usar Modelo
                                          </DropdownMenuItem>
                                          <DropdownMenuItem>Excluir</DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          )}
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
              Mostrando <strong>1-{filteredTemplates.length}</strong> de <strong>{templates.length}</strong> modelos.
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
