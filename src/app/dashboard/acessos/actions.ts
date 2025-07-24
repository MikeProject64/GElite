'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Collaborator, SystemUser } from '@/types';

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

    const token = randomBytes(20).toString('hex');
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
    const { dbAdmin, adminAuth } = await getFirebaseAdmin();

    const collaboratorRef = dbAdmin.collection('collaborators').doc(collaboratorId);
    const docSnap = await collaboratorRef.get();
    if (!docSnap.exists || docSnap.data()?.userId !== mainAccountId || docSnap.data()?.teamMemberUid !== teamMemberUid) {
      throw new Error("Permissão negada ou dados inconsistentes.");
    }
    
    await adminAuth.updateUser(teamMemberUid, { disabled: shouldDisable });
    
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
        const { dbAdmin, adminAuth } = await getFirebaseAdmin();

        const collaboratorRef = dbAdmin.collection('collaborators').doc(collaboratorId);
        const docSnap = await collaboratorRef.get();
        if (!docSnap.exists || docSnap.data()?.userId !== mainAccountId || docSnap.data()?.teamMemberUid !== teamMemberUid) {
            throw new Error("Permissão negada ou dados inconsistentes.");
        }

        // 1. Exclui o usuário do Firebase Authentication
        await adminAuth.deleteUser(teamMemberUid);

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

// Nova Action Unificada
export async function createCollaboratorAndInvite(
  ownerId: string,
  name: string,
  email: string,
  allowedFunctions: string[]
): Promise<{ success: boolean; message: string; link?: string }> {
  try {
    const { dbAdmin } = await getFirebaseAdmin();

    // 1. Verificar se já existe um colaborador com este e-mail para esta conta
    const existingCollabQuery = dbAdmin.collection('collaborators')
      .where('userId', '==', ownerId)
      .where('email', '==', email);
    const existingCollabSnap = await existingCollabQuery.get();
    if (!existingCollabSnap.empty) {
      return { success: false, message: 'Já existe um convite ou membro com este e-mail.' };
    }

    // 2. Gerar Token de Convite
    const token = randomBytes(20).toString('hex');
    const expiresAt = FieldValue.serverTimestamp(); // Temporário, será atualizado abaixo

    // 3. Criar o documento do colaborador
    const collaboratorRef = dbAdmin.collection('collaborators').doc();
    await collaboratorRef.set({
      userId: ownerId,
      name,
      email,
      type: 'collaborator',
      allowedFunctions,
      createdAt: FieldValue.serverTimestamp(),
      inviteToken: token,
      // Define a expiração para 7 dias a partir de agora
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // 4. Construir e retornar o link
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/equipe/registrar?token=${token}`;
    
    return { success: true, message: 'Convite gerado com sucesso!', link: inviteLink };

  } catch (error: any) {
    console.error("Erro ao criar colaborador e convite:", error);
    return { success: false, message: error.message || 'Falha ao processar o convite.' };
  }
} 