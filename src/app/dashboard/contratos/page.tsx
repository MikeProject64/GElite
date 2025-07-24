

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MoreHorizontal, FileSignature, PauseCircle, PlayCircle, Ban, History, Trash2 } from 'lucide-react';
import { ServiceAgreement } from '@/types';
import { Badge } from '@/components/ui/badge';
import { CreateContractModal } from '@/components/create-contract-modal';

const frequencyMap = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannually: 'Semestral',
    annually: 'Anual',
};

export default function ContratosPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [deletingAgreementId, setDeletingAgreementId] = useState<string | null>(null);
    const [editingAgreement, setEditingAgreement] = useState<ServiceAgreement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        const qAgreements = query(collection(db, 'serviceAgreements'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(qAgreements, snap => {
            setAgreements(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceAgreement)));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const handleEdit = (agreement: ServiceAgreement) => { 
        setEditingAgreement(agreement); 
        setIsModalOpen(true); 
    };

    const handleDelete = (agreementId: string) => { 
        setDeletingAgreementId(agreementId); 
        setIsAlertOpen(true); 
    };
    
    const handleStatusChange = async (agreement: ServiceAgreement, newStatus: ServiceAgreement['status']) => {
        try {
            await updateDoc(doc(db, 'serviceAgreements', agreement.id), { status: newStatus });
            toast({ title: 'Sucesso!', description: 'Status do contrato atualizado.'});
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
        }
    };

    const confirmDelete = async () => {
        if (!deletingAgreementId) return;
        try {
            await deleteDoc(doc(db, 'serviceAgreements', deletingAgreementId));
            toast({ title: 'Sucesso!', description: 'Contrato excluído.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir o contrato.' });
        } finally {
            setDeletingAgreementId(null);
            setIsAlertOpen(false);
        }
    };
    
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Gestão de Contratos</CardTitle>
                    <CardDescription>Acompanhe seus contratos ativos e a geração automática de serviços.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>) :
                     agreements.length === 0 ? (<div className="text-center py-10"><FileSignature className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Nenhum contrato criado.</h3></div>) :
                    (<Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Contrato / Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Próxima O.S.</TableHead>
                                <TableHead>Frequência</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agreements.map(agreement => (
                            <TableRow key={agreement.id}>
                                <TableCell><div className="font-medium">{agreement.title}</div><div className="text-sm text-muted-foreground">{agreement.clientName}</div></TableCell>
                                <TableCell><Badge variant={agreement.status === 'active' ? 'default' : 'secondary'}>{agreement.status === 'active' ? 'Ativo' : (agreement.status === 'paused' ? 'Pausado' : 'Finalizado')}</Badge></TableCell>
                                <TableCell>{format(agreement.nextDueDate.toDate(), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{frequencyMap[agreement.frequency]}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleEdit(agreement)}>Editar</DropdownMenuItem>
                                            {agreement.status === 'active' && <DropdownMenuItem onClick={() => handleStatusChange(agreement, 'paused')}><PauseCircle className="mr-2 h-4 w-4"/>Pausar</DropdownMenuItem>}
                                            {agreement.status === 'paused' && <DropdownMenuItem onClick={() => handleStatusChange(agreement, 'active')}><PlayCircle className="mr-2 h-4 w-4"/>Reativar</DropdownMenuItem>}
                                            {agreement.status !== 'finished' && <DropdownMenuItem onClick={() => handleStatusChange(agreement, 'finished')}><Ban className="mr-2 h-4 w-4"/>Finalizar</DropdownMenuItem>}
                                            <DropdownMenuItem disabled><History className="mr-2 h-4 w-4"/>Ver Histórico</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(agreement.id)}><Trash2 className="mr-2 h-4 w-4"/>Excluir</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>)}
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">Mostrando <strong>{agreements.length}</strong> contrato(s).</div>
                </CardFooter>
            </Card>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação é irreversível e excluirá o contrato. As Ordens de Serviço já geradas não serão afetadas.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingAgreementId(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Sim, Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* Modal para editar, que é diferente do modal de criar no layout */}
            <CreateContractModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} agreement={editingAgreement} />
        </>
    );
}
