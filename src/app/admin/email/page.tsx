'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Clock, CheckCircle, XCircle, Hourglass, PlusCircle, MoreHorizontal, Edit, Trash, Users, Terminal, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ManageListDialog } from '@/components/admin/email/manage-list-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// Interfaces (as mesmas de antes)
interface EmailTemplate { id: string; name: string; subject: string; createdAt: { seconds: number; }; htmlContent?: string; }
interface EmailList { id: string; name: string; emails: string[]; createdAt: { seconds: number; }; }
interface QueueJob { id:string; status: 'queued' | 'processing' | 'completed' | 'failed'; createdAt: { seconds: number }; templateId: string; listIds: string[]; sentCount?: number; error?: string; }
interface RecipientStatus { id: string; email: string; status: 'sent' | 'failed'; error?: string; }

// --- COMPONENTE DE DETALHES DO ENVIO ---
function JobDetailsDialog({ open, onOpenChange, job }: { open: boolean, onOpenChange: (open: boolean) => void, job: QueueJob | null }) {
    const [recipients, setRecipients] = useState<RecipientStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (job && open) {
            setIsLoading(true);
            const recipientsQuery = query(collection(db, `emailQueue/${job.id}/recipients`));
            const unsubscribe = onSnapshot(recipientsQuery, (snapshot) => {
                setRecipients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecipientStatus)));
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching recipients:", error);
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [job, open]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
        }

        if (recipients.length > 0) {
            return (
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Detalhes</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {recipients.map(r => (
                                <TableRow key={r.id}>
                                    <TableCell>{r.email}</TableCell>
                                    <TableCell><Badge variant={r.status === 'sent' ? 'default' : 'destructive'}>{r.status === 'sent' ? 'Enviado' : 'Falhou'}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{r.error || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            );
        }

        if (job?.error) {
            return (
                <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Erro na Campanha</AlertTitle>
                    <AlertDescription>{job.error}</AlertDescription>
                </Alert>
            );
        }

        return <div className="py-12 text-center text-muted-foreground">Nenhum detalhe de destinatário disponível.</div>;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Detalhes do Envio</DialogTitle>
                    <DialogDescription>Status de entrega para cada destinatário nesta campanha.</DialogDescription>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
}


// --- COMPONENTE DE CRIAÇÃO DE CAMPANHA (MODAL) ---
function CreateCampaignDialog({ open, onOpenChange, templates, lists, onCampaignQueued }: { open: boolean, onOpenChange: (open: boolean) => void, templates: EmailTemplate[], lists: EmailList[], onCampaignQueued: () => void }) {
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedLists, setSelectedLists] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const handleSendCampaign = async () => {
        if (!selectedTemplate || selectedLists.length === 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Selecione um modelo e pelo menos uma lista.'});
            return;
        }
        setIsSending(true);
        try {
            await addDoc(collection(db, 'emailQueue'), {
                templateId: selectedTemplate,
                listIds: selectedLists,
                status: 'queued',
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Campanha na fila!', description: 'Sua campanha foi adicionada à fila de envio.'});
            setSelectedTemplate('');
            setSelectedLists([]);
            onCampaignQueued(); // Fecha o modal e reseta
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível colocar a campanha na fila.'});
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Nova Campanha</DialogTitle>
                    <DialogDescription>Selecione o modelo e as listas de destinatários para o envio.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>1. Escolha o Modelo</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}><SelectTrigger><SelectValue placeholder="Selecione um modelo..." /></SelectTrigger><SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                        <Label>2. Escolha as Listas</Label>
                        <MultiSelect options={lists.map(l => ({ value: l.id, label: `${l.name} (${l.emails.length})` }))} value={selectedLists} onChange={setSelectedLists} placeholder="Selecione uma ou mais listas..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSendCampaign} disabled={isSending || !selectedTemplate || selectedLists.length === 0}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Colocar na Fila
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- COMPONENTE DA ABA DE CAMPANHAS ---
function CampaignsTab({ templates, lists, jobs, isLoading, totalContacts }: { templates: EmailTemplate[], lists: EmailList[], jobs: QueueJob[], isLoading: boolean, totalContacts: number }) {
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleViewDetails = (job: QueueJob) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  const statusMap = {
      queued: { text: "Na Fila", icon: Clock, color: "text-blue-500" },
      processing: { text: "Processando", icon: Hourglass, color: "text-yellow-500 animate-spin" },
      completed: { text: "Concluído", icon: CheckCircle, color: "text-green-500" },
      failed: { text: "Falhou", icon: XCircle, color: "text-red-500" },
  };
  
  const getTotalRecipients = (ids: string[]) => ids.reduce((acc, listId) => acc + (lists.find(l => l.id === listId)?.emails?.length || 0), 0);

  return (
    <>
    <div className="space-y-8">
        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Modelos</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{templates.length}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Listas</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{lists.length}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Contatos Únicos</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-bold">{totalContacts}</div></CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Histórico de Envios</CardTitle>
                    <CardDescription>Acompanhe o status de suas campanhas de email.</CardDescription>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Nova Campanha</Button>
            </CardHeader>
            <CardContent>
            {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
            <Table>
                <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Enviados</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                {jobs.map(job => {
                    const StatusIcon = statusMap[job.status].icon;
                    return (
                        <TableRow key={job.id}>
                            <TableCell><div className="flex items-center gap-2"><StatusIcon className={`h-4 w-4 ${statusMap[job.status].color}`} /><span>{statusMap[job.status].text}</span></div></TableCell>
                            <TableCell>{job.createdAt ? format(new Date(job.createdAt.seconds * 1000), "dd/MM/yy HH:mm") : 'Pendente...'}</TableCell>
                            <TableCell className="text-right">{job.status === 'completed' ? `${job.sentCount} / ${getTotalRecipients(job.listIds)}` : '-'}</TableCell>
                            <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(job)}>Ver Detalhes</Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
                </TableBody>
            </Table>
            )}
            </CardContent>
        </Card>
    </div>
    <JobDetailsDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} job={selectedJob} />
    <CreateCampaignDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} templates={templates} lists={lists} onCampaignQueued={() => setIsCreateOpen(false)} />
    </>
  );
}

// --- COMPONENTE DE PREVIEW DO MODELO (MODAL) ---
function PreviewTemplateDialog({ open, onOpenChange, template }: { open: boolean, onOpenChange: (open: boolean) => void, template: EmailTemplate | null }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Pré-visualização: {template?.name}</DialogTitle>
                    <DialogDescription>Esta é uma pré-visualização de como seu email aparecerá para os destinatários.</DialogDescription>
                </DialogHeader>
                <div className="h-full w-full bg-gray-100 rounded-md mt-4">
                    <iframe
                        srcDoc={template?.htmlContent || ''}
                        title="Pré-visualização do Email"
                        className="w-full h-full border-none"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}


// --- COMPONENTE DA ABA DE MODELOS ---
function TemplatesTab({ templates, isLoading }: { templates: EmailTemplate[], isLoading: boolean }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [previewingTemplate, setPreviewingTemplate] = useState<EmailTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteDoc(doc(db, 'emailTemplates', deletingId));
    toast({ title: 'Sucesso', description: 'Modelo excluído!' });
    setIsAlertOpen(false);
    setDeletingId(null);
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewingTemplate(template);
    setIsPreviewOpen(true);
  };

  return (
    <>
    <Card>
        <CardHeader>
          <CardTitle>Meus Modelos</CardTitle>
          <CardDescription>Crie e gerencie os modelos de email para suas campanhas.</CardDescription>
        </CardHeader>
        <CardContent>
             {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : templates.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Nome do Modelo</TableHead><TableHead>Assunto</TableHead><TableHead>Criado em</TableHead><TableHead><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>{template.createdAt ? format(new Date(template.createdAt.seconds * 1000), "dd/MM/yyyy") : 'Pendente...'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePreview(template)}><Eye className="mr-2 h-4 w-4" /> Pré-visualizar</DropdownMenuItem>
                            <DropdownMenuItem asChild><Link href={`/admin/email/templates/editor/${template.id}`}><Edit className="mr-2 h-4 w-4" /> Editar</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDeletingId(template.id); setIsAlertOpen(true); }} className="text-red-600"><Trash className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <div className="text-center py-12 text-muted-foreground"><p>Nenhum modelo encontrado.</p></div>}
        </CardContent>
        <CardFooter>
            <Button asChild><Link href="/admin/email/templates/editor/new"><PlusCircle className="mr-2 h-4 w-4" />Novo Modelo</Link></Button>
        </CardFooter>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </Card>
    <PreviewTemplateDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} template={previewingTemplate} />
    </>
  );
}

// --- COMPONENTE DA ABA DE LISTAS ---
function ListsTab({ lists, isLoading } : { lists: EmailList[], isLoading: boolean }) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [managingListId, setManagingListId] = useState<string | null>(null);
  const { toast } = useToast();
  const form = useForm<{name: string, description?: string}>({ resolver: zodResolver(z.object({ name: z.string().min(3), description: z.string().optional() }))});

  const onSubmit = async (data: {name: string, description?: string}) => {
    await addDoc(collection(db, 'emailLists'), { ...data, emails: [], createdAt: serverTimestamp() });
    toast({ title: 'Sucesso', description: 'Lista criada!' });
    form.reset();
    setIsCreateDialogOpen(false);
  };
  
  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteDoc(doc(db, 'emailLists', deletingId));
    toast({ title: 'Sucesso', description: 'Lista excluída!' });
    setIsAlertOpen(false);
    setDeletingId(null);
  };

  const openManageDialog = (listId: string) => { setManagingListId(listId); setIsManageDialogOpen(true); };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Minhas Listas</CardTitle>
        <CardDescription>Crie e gerencie listas de contatos para suas campanhas.</CardDescription>
      </CardHeader>
      <CardContent>
          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div> : lists.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Contatos</TableHead><TableHead>Criada em</TableHead><TableHead><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell className="font-medium">{list.name}</TableCell>
                      <TableCell>{(list.emails || []).length}</TableCell>
                      <TableCell>{list.createdAt ? format(new Date(list.createdAt.seconds * 1000), "dd/MM/yyyy") : 'Pendente...'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openManageDialog(list.id)}><Users className="mr-2 h-4 w-4" /> Gerenciar Contatos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDeletingId(list.id); setIsAlertOpen(true); }} className="text-red-600"><Trash className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <div className="text-center py-12 text-muted-foreground"><p>Nenhuma lista encontrada.</p></div>}
      </CardContent>
       <CardFooter>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Nova Lista</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Criar Nova Lista</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome da Lista</FormLabel><FormControl><Input placeholder="Ex: Clientes VIP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input placeholder="Ex: Promoções especiais" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting}>Criar Lista</Button></DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardFooter>
    </Card>
     <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
     <ManageListDialog listId={managingListId} open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen} />
    </>
  );
}

// --- PÁGINA PRINCIPAL ---
export default function EmailMarketingPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Flag para garantir que o loading só seja desativado uma vez.
    let initialLoads = 2; // templates e lists
    const handleInitialLoad = () => {
        initialLoads--;
        if (initialLoads === 0) {
            setIsLoading(false);
        }
    };

    const unsubTemplates = onSnapshot(query(collection(db, 'emailTemplates'), orderBy('createdAt', 'desc')), (snapshot) => {
        setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailTemplate)));
        handleInitialLoad();
    });

    const unsubLists = onSnapshot(query(collection(db, 'emailLists'), orderBy('createdAt', 'desc')), (snapshot) => {
        setLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmailList)));
        handleInitialLoad();
    });
    
    const unsubJobs = onSnapshot(query(collection(db, 'emailQueue'), orderBy('createdAt', 'desc')), (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueueJob)));
    });


    return () => { unsubTemplates(); unsubLists(); unsubJobs(); };
  }, []);

  const totalContacts = useMemo(() => {
    const allEmails = lists.flatMap(list => list.emails);
    return new Set(allEmails).size;
  }, [lists]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Marketing</h1>
        <p className="text-muted-foreground">Crie modelos, gerencie listas e envie campanhas de email.</p>
      </div>
      
      <Tabs defaultValue="campaigns">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
          <TabsTrigger value="lists">Listas</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          {isLoading ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin"/> : <CampaignsTab templates={templates} lists={lists} jobs={jobs} isLoading={isLoading} totalContacts={totalContacts} />}
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
           {isLoading ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin"/> : <TemplatesTab templates={templates} isLoading={isLoading}/>}
        </TabsContent>
        <TabsContent value="lists" className="mt-4">
           {isLoading ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin"/> : <ListsTab lists={lists} isLoading={isLoading} />}
        </TabsContent>
      </Tabs>
    </div>
  );
} 