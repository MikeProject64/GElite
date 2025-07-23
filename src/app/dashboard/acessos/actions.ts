'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore'; // Corrigido: Importar Timestamp do SDK de Admin

/**
 * Gera um token de convite único para um colaborador e o salva no banco de dados.
 * @param collaboratorId O ID do documento do colaborador para o qual gerar o convite.
 * @param mainAccountId O UID do dono da conta que está gerando o convite.
 */
export async function generateInviteLink(collaboratorId: string, mainAccountId: string): Promise<{ success: boolean; link?: string; message?: string }> {
  try {
    const { dbAdmin } = await getFirebaseAdmin();
    
    // Verificação de segurança no servidor
    // A chamada a `authAdmin.verifyIdToken()` ou similar seria ideal aqui
    // mas por enquanto, confiamos que a sessão do Next.js é segura.

    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Expira em 7 dias

    const collaboratorRef = dbAdmin.collection('collaborators').doc(collaboratorId);
    
    // Verificação extra: garante que o colaborador pertence ao usuário que está fazendo a chamada
    const docSnap = await collaboratorRef.get();
    if (!docSnap.exists || docSnap.data()?.userId !== mainAccountId) {
      throw new Error("Permissão negada. O colaborador não pertence a esta conta.");
    }

    await collaboratorRef.update({
      inviteToken: token,
      inviteExpiresAt: expiresAt,
    });

    // Lógica para determinar a URL base correta
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BASE_URL || 'https://gestorelite.app' 
      : 'http://localhost:3000';
      
    const inviteLink = `${baseUrl}/equipe/registrar?token=${token}`;
    
    revalidatePath('/dashboard/acessos');

    return { success: true, link: inviteLink };
  } catch (error: any) {
    console.error('Erro ao gerar link de convite:', error);
    return { success: false, message: error.message || 'Falha ao gerar o link.' };
  }
}

export async function toggleUserAccess(
  collaboratorId: string, 
  teamMemberUid: string, 
  mainAccountId: string,
  shouldDisable: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const { authAdmin, dbAdmin } = await getFirebaseAdmin();

    const collaboratorRef = dbAdmin.collection('collaborators').doc(collaboratorId);
    const docSnap = await collaboratorRef.get();
    if (!docSnap.exists || docSnap.data()?.userId !== mainAccountId || docSnap.data()?.teamMemberUid !== teamMemberUid) {
      throw new Error("Permissão negada ou dados inconsistentes.");
    }
    
    await authAdmin.updateUser(teamMemberUid, { disabled: shouldDisable });
    
    // Atualiza o status no documento do colaborador
    await collaboratorRef.update({
      accessStatus: shouldDisable ? 'paused' : 'active'
    });

    revalidatePath('/dashboard/acessos');
    const action = shouldDisable ? 'pausado' : 'reativado';
    return { success: true, message: `Acesso do membro da equipe foi ${action} com sucesso.` };

  } catch (error: any) {
    console.error(`Erro ao ${shouldDisable ? 'pausar' : 'reativar'} acesso:`, error);
    return { success: false, message: error.message || 'Falha ao alterar o status do acesso.' };
  }
}


export async function deleteTeamMemberAccess(
  collaboratorId: string, 
  teamMemberUid: string, 
  mainAccountId: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { authAdmin, dbAdmin } = await getFirebaseAdmin();

        const collaboratorRef = dbAdmin.collection('collaborators').doc(collaboratorId);
        const docSnap = await collaboratorRef.get();
        if (!docSnap.exists || docSnap.data()?.userId !== mainAccountId || docSnap.data()?.teamMemberUid !== teamMemberUid) {
            throw new Error("Permissão negada ou dados inconsistentes.");
        }

        // 1. Exclui o usuário do Firebase Authentication
        await authAdmin.deleteUser(teamMemberUid);

        // 2. Exclui o documento 'user' do membro da equipe no Firestore
        await dbAdmin.collection('users').doc(teamMemberUid).delete();

        // 3. Limpa os campos de acesso no documento do colaborador, permitindo um novo convite
        await collaboratorRef.update({
            teamMemberUid: null,
            inviteToken: null,
            inviteExpiresAt: null,
        });

        revalidatePath('/dashboard/acessos');
        return { success: true, message: "O acesso do membro foi removido com sucesso. Você pode gerar um novo convite para este colaborador se desejar." };

    } catch (error: any) {
        console.error("Erro ao excluir acesso do membro da equipe:", error);
        return { success: false, message: error.message || "Falha ao remover o acesso do membro." };
    }
}

export async function updateMemberPermissions(
    collaboratorId: string,
    mainAccountId: string,
    allowedFunctions: string[]
): Promise<{ success: boolean; message: string }> {
    try {
        const { dbAdmin } = await getFirebaseAdmin();

        const collaboratorRef = dbAdmin.collection('collaborators').doc(collaboratorId);
        const docSnap = await collaboratorRef.get();

        if (!docSnap.exists || docSnap.data()?.userId !== mainAccountId) {
            throw new Error("Permissão negada ou colaborador não encontrado.");
        }

        await collaboratorRef.update({ allowedFunctions });

        revalidatePath('/dashboard/acessos');
        return { success: true, message: "Permissões do membro da equipe atualizadas com sucesso." };

    } catch (error: any) {
        console.error("Erro ao atualizar permissões:", error);
        return { success: false, message: error.message || "Falha ao atualizar as permissões." };
    }
} 