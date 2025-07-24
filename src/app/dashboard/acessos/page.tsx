'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, User, Building2, LinkIcon, Copy, CheckCircle, Clock, AlertTriangle, MoreVertical, Trash2, Play, Pause, Settings, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collaborator } from '@/types';
import { generateInviteLink, toggleUserAccess, deleteTeamMemberAccess, updateMemberPermissions } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AppFunction } from '@/components/auth-provider';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createCollaboratorAndInvite } from './actions';


// Lista de nomes de permissões que não podem ser delegadas a membros.
const FORBIDDEN_MEMBER_PERMISSIONS = [
  'Painel',
  'Auditoria', // Nome corrigido
  'Configurações',
  'Perfil',
  'Assinatura', // Nome corrigido
  'Tutoriais',
  'Equipe' // Nome corrigido para corresponder à UI
];

function PermissionsModal({
  open,
  onOpenChange,
  collaborator,
  ownerPlanFunctions,
  allAvailableFunctions,
  onSubmit,
  isSubmitting,
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  collaborator: Collaborator | null,
  ownerPlanFunctions: string[],
  allAvailableFunctions: AppFunction[],
  onSubmit: (selectedFunctions: string[]) => void,
  isSubmitting: boolean,
}) {
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

  useEffect(() => {
    if (collaborator?.allowedFunctions) {
      setSelectedFunctions(collaborator.allowedFunctions);
    } else {
      setSelectedFunctions([]);
    }
  }, [collaborator]);

  if (!collaborator) return null;

  const handleToggle = (func: string) => {
    setSelectedFunctions(prev => 
      prev.includes(func) ? prev.filter(f => f !== func) : [...prev, func]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões</DialogTitle>
          <DialogDescription>
            Selecione as áreas que <span className="font-bold">{collaborator.name}</span> pode acessar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {allAvailableFunctions
            .filter(func => ownerPlanFunctions.includes(func.id))
            .filter(func => !FORBIDDEN_MEMBER_PERMISSIONS.includes(func.name)) // Filtra as permissões proibidas
            .map((func) => (
            <div key={func.id} className="flex items-center space-x-2">
              <Checkbox
                id={`perm-${func.id}`}
                checked={selectedFunctions.includes(func.id)}
                onCheckedChange={() => handleToggle(func.id)}
              />
              <label
                htmlFor={`perm-${func.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {func.name}
              </label>
            </div>
          ))}
           {ownerPlanFunctions.length === 0 && (
             <p className="text-sm text-muted-foreground text-center">Nenhuma funcionalidade disponível no seu plano para atribuir.</p>
           )}
        </div>
        <DialogFooter>
          <Button 
            type="button" 
            onClick={() => onSubmit(selectedFunctions)}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Permissões"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const inviteFormSchema = z.object({
  name: z.string().min(3, { message: "O nome é obrigatório." }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  allowedFunctions: z.array(z.string()).min(1, { message: "Selecione pelo menos uma permissão." }),
});

function InviteMemberModal({
  open,
  onOpenChange,
  ownerPlanFunctions,
  allAvailableFunctions,
  onSubmit,
  isSubmitting,
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  ownerPlanFunctions: string[],
  allAvailableFunctions: AppFunction[],
  onSubmit: (data: z.infer<typeof inviteFormSchema>) => void,
  isSubmitting: boolean,
}) {
  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      name: "",
      email: "",
      allowedFunctions: [],
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar Novo Membro</DialogTitle>
          <DialogDescription>
            Insira os dados do membro, defina suas permissões e gere o link de convite.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do membro da equipe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="allowedFunctions"
              render={({ field }) => (
                <FormItem>
                   <FormLabel>Permissões</FormLabel>
                   <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-4">
                     {allAvailableFunctions
                        .filter(func => ownerPlanFunctions.includes(func.id))
                        .filter(func => !FORBIDDEN_MEMBER_PERMISSIONS.includes(func.name))
                        .map((func) => (
                           <FormField
                            key={func.id}
                            control={form.control}
                            name="allowedFunctions"
                            render={({ field }) => {
                              return (
                                <FormItem key={func.id} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value.includes(func.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, func.id])
                                          : field.onChange(field.value?.filter((value) => value !== func.id));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{func.name}</FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                   </div>
                   <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Gerar Convite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function AcessosEquipePage() {
  const { user, systemUser, userPlan, availableFunctions } = useAuth();
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Collaborator | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState<Collaborator | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  const isProfileComplete = systemUser &&
    systemUser.name &&
    systemUser.phone &&
    systemUser.cpfCnpj &&
    systemUser.endereco;

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const q = query(collection(db, 'collaborators'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const collabs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
      setCollaborators(collabs);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar colaboradores: ", error);
      setIsLoading(false);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados da equipe.' });
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleGenerateLink = async (collaboratorId: string) => {
    if (!user) return;
    setIsGenerating(collaboratorId);
    const result = await generateInviteLink(collaboratorId, user.uid);
    if (result.success && result.link) {
      toast({ title: 'Link de Convite Gerado!', description: 'O link foi copiado para sua área de transferência.' });
      navigator.clipboard.writeText(result.link);
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message || 'Falha ao gerar o link.' });
    }
    setIsGenerating(null);
  };

  const copyLink = (token: string) => {
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/equipe/registrar?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Link Copiado!' });
  }

  const handleInviteSubmit = async (data: z.infer<typeof inviteFormSchema>) => {
    if (!user) return;
    setIsSubmittingAction('invite');
    const result = await createCollaboratorAndInvite(user.uid, data.name, data.email, data.allowedFunctions);
    if (result.success && result.link) {
      setGeneratedInviteLink(result.link);
      setShowInviteModal(false);
    } else {
      toast({ variant: 'destructive', title: 'Erro ao Convidar', description: result.message });
    }
    setIsSubmittingAction(null);
  };

  const copyAndCloseInviteLinkModal = () => {
    if (generatedInviteLink) {
      navigator.clipboard.writeText(generatedInviteLink);
      toast({ title: 'Link Copiado!' });
      setGeneratedInviteLink(null);
    }
  };

  const getStatus = (collaborator: Collaborator) => {
    if (collaborator.type === 'sector') return { text: 'N/A', color: 'text-muted-foreground', Icon: null };
    if (collaborator.teamMemberUid) {
      if(collaborator.accessStatus === 'paused') {
        return { text: 'Acesso Pausado', color: 'text-yellow-600', Icon: Pause };
      }
      return { text: 'Acesso Ativo', color: 'text-green-600', Icon: CheckCircle };
    }
    if (collaborator.inviteToken) {
       if (collaborator.inviteExpiresAt && collaborator.inviteExpiresAt.toDate() < new Date()) {
         return { text: 'Convite Expirado', color: 'text-destructive', Icon: Clock };
       }
       return { text: 'Convite Pendente', color: 'text-amber-600', Icon: Clock };
    }
    return { text: 'Sem Acesso', color: 'text-muted-foreground', Icon: null };
  };

  const handleToggleAccess = async (collaborator: Collaborator, shouldDisable: boolean) => {
    if (!user || !collaborator.teamMemberUid) return;
    setIsSubmittingAction(collaborator.id);
    const result = await toggleUserAccess(collaborator.id, collaborator.teamMemberUid, user.uid, shouldDisable);
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    setIsSubmittingAction(null);
  }

  const handleUpdatePermissions = async (selectedFunctions: string[]) => {
    if (!user || !showPermissionsModal) return;
    setIsSubmittingAction(showPermissionsModal.id);
    const result = await updateMemberPermissions(showPermissionsModal.id, user.uid, selectedFunctions);
    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
      setShowPermissionsModal(null);
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    setIsSubmittingAction(null);
  };

  const handleDelete = async (collaborator: Collaborator | null) => {
    if(!user || !collaborator || !collaborator.teamMemberUid) return;
    setIsSubmittingAction(collaborator.id);
    const result = await deleteTeamMemberAccess(collaborator.id, collaborator.teamMemberUid, user.uid);
     if (result.success) {
      toast({ title: 'Sucesso!', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: result.message });
    }
    setShowDeleteConfirm(null);
    setIsSubmittingAction(null);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Acessos da Equipe</h1>
        <p className="text-muted-foreground">Gerencie quem da sua equipe pode acessar o sistema.</p>
      </div>

      {systemUser?.role !== 'team_member' && (
        <Card>
            <CardHeader>
                <CardTitle>Link de Acesso para sua Equipe</CardTitle>
                <CardDescription>
                    Compartilhe este link com os membros da sua equipe que já criaram uma conta. 
                    Ele os levará para uma página de login personalizada para sua empresa.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <Input 
                        readOnly 
                        value={`${process.env.NEXT_PUBLIC_BASE_URL}/login/${user?.uid}`}
                        className="bg-muted/50"
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_BASE_URL}/login/${user?.uid}`);
                            toast({ title: 'Link de login copiado!' });
                        }}
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}

      {!isProfileComplete && (
         <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Perfil Incompleto</AlertTitle>
            <AlertDescription>
                Você precisa completar seu perfil antes de poder convidar membros para sua equipe.
                <Link href="/dashboard/perfil" className="font-bold underline ml-2">
                    Completar Perfil
                </Link>
            </AlertDescription>
         </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Membros</CardTitle>
            <CardDescription>Gerencie os membros da sua equipe e seus respectivos acessos.</CardDescription>
          </div>
          <Button onClick={() => setShowInviteModal(true)} disabled={!isProfileComplete}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Convidar Novo Membro
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {collaborators.map(c => {
              const status = getStatus(c);
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={c.photoURL} alt={c.name} className="object-cover" />
                      <AvatarFallback>
                        {c.type === 'collaborator' ? <User /> : <Building2 />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        {status.Icon && <status.Icon className={`h-4 w-4 ${status.color}`} />}
                        <span className={status.color}>{status.text}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {c.teamMemberUid && (
                        <div className="flex items-center gap-2">
                           <Button variant="outline" size="sm" onClick={() => setShowPermissionsModal(c)}>
                                <Settings className="mr-2 h-4 w-4" />
                                Permissões
                           </Button>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={isSubmittingAction === c.id}>
                                     {isSubmittingAction === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                {c.accessStatus !== 'paused' ? (
                                 <DropdownMenuItem onClick={() => handleToggleAccess(c, true)}>
                                     <Pause className="mr-2 h-4 w-4" />
                                     Pausar Acesso
                                 </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleToggleAccess(c, false)}>
                                     <Play className="mr-2 h-4 w-4" />
                                     Reativar Acesso
                                 </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(c)}>
                                     <Trash2 className="mr-2 h-4 w-4" />
                                     Excluir Acesso
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                     )}
                     
                     {!c.teamMemberUid && c.inviteToken && (
                       <>
                        <Button variant="outline" size="sm" onClick={() => copyLink(c.inviteToken!)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar Link
                        </Button>
                          <Button variant="secondary" size="sm" onClick={() => handleGenerateLink(c.id)} disabled={isGenerating === c.id}>
                          {isGenerating === c.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Gerar Novo
                        </Button>
                      </>
                    )}

                    {!c.teamMemberUid && !c.inviteToken && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handleGenerateLink(c.id)} 
                        disabled={isGenerating === c.id || !isProfileComplete}
                        title={!isProfileComplete ? "Complete seu perfil para gerar convites" : "Gerar convite de acesso"}
                      >
                        {isGenerating === c.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Gerar Convite
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
             {collaborators.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                    Você ainda não adicionou nenhum colaborador. Adicione em <a href="/dashboard/colaboradores" className="text-primary underline">Colaboradores</a>.
                </p>
            )}
          </div>
        </CardContent>
      </Card>

      <PermissionsModal 
        open={!!showPermissionsModal}
        onOpenChange={(open) => !open && setShowPermissionsModal(null)}
        collaborator={showPermissionsModal}
        ownerPlanFunctions={userPlan?.allowedFunctions || []}
        allAvailableFunctions={availableFunctions}
        onSubmit={handleUpdatePermissions}
        isSubmitting={!!isSubmittingAction}
      />

      <InviteMemberModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        ownerPlanFunctions={userPlan?.allowedFunctions || []}
        allAvailableFunctions={availableFunctions}
        onSubmit={handleInviteSubmit}
        isSubmitting={isSubmittingAction === 'invite'}
      />

      <Dialog open={!!generatedInviteLink} onOpenChange={() => setGeneratedInviteLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convite Gerado com Sucesso!</DialogTitle>
            <DialogDescription>
              Compartilhe este link com o novo membro da equipe. Ele é válido por 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <Input readOnly value={generatedInviteLink || ''} className="bg-muted" />
            <Button variant="outline" size="icon" onClick={copyAndCloseInviteLinkModal}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedInviteLink(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o acesso do membro da equipe
                <span className="font-bold"> {showDeleteConfirm?.name}</span> e removerá sua conta. 
                O colaborador precisará ser convidado novamente para recuperar o acesso.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => handleDelete(showDeleteConfirm)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                {isSubmittingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sim, excluir acesso'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
} 