'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import * as z from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

const registerSchema = z.object({
  token: z.string().nonempty(),
  name: z.string().min(3, 'O nome precisa de pelo menos 3 caracteres.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha precisa de pelo menos 6 caracteres.'),
});

// 1. Valida o Token e busca os dados do convite
export async function validateInviteToken(token: string): Promise<{ 
  success: boolean; 
  message: string; 
  collaboratorName?: string;
  accountOwnerName?: string;
  companyName?: string;
  mainAccountId?: string;
}> {
  if (!token) {
    return { success: false, message: 'Token de convite não fornecido.' };
  }

  try {
    const { dbAdmin } = await getFirebaseAdmin();
    const collaboratorsRef = dbAdmin.collection('collaborators');
    const q = collaboratorsRef.where('inviteToken', '==', token);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return { success: false, message: 'Este link de convite é inválido ou já foi usado.' };
    }

    const collaboratorDoc = querySnapshot.docs[0];
    const collaborator = collaboratorDoc.data();

    if (collaborator.inviteExpiresAt && collaborator.inviteExpiresAt.toDate() < new Date()) {
      return { success: false, message: 'Este link de convite expirou.' };
    }

    // Busca os dados da conta principal
    const mainAccountDoc = await dbAdmin.collection('users').doc(collaborator.userId).get();
    if (!mainAccountDoc.exists) {
        return { success: false, message: 'A conta principal associada a este convite não foi encontrada.' };
    }
    const mainAccountData = mainAccountDoc.data();

    return { 
      success: true, 
      message: 'Convite válido.', 
      collaboratorName: collaborator.name,
      accountOwnerName: mainAccountData?.name,
      companyName: mainAccountData?.companyName,
      mainAccountId: collaborator.userId,
    };
  } catch (error) {
    console.error('Erro ao validar token:', error);
    return { success: false, message: 'Ocorreu um erro ao verificar o convite.' };
  }
}


// 2. Processa o registro do novo membro
export async function registerTeamMember(formData: unknown): Promise<{ success: boolean; message: string }> {
  const result = registerSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, message: result.error.errors.map(e => e.message).join(', ') };
  }
  const { token, name, email, password } = result.data;

  try {
    const { dbAdmin, authAdmin } = await getFirebaseAdmin();

    // Re-valida o token no servidor para segurança
    const collaboratorsRef = dbAdmin.collection('collaborators');
    const q = collaboratorsRef.where('inviteToken', '==', token);
    const querySnapshot = await q.get();
    
    if (querySnapshot.empty) throw new Error('Convite inválido ou já utilizado.');
    
    const collaboratorDoc = querySnapshot.docs[0];
    const collaborator = collaboratorDoc.data();
    const collaboratorId = collaboratorDoc.id;
    const mainAccountId = collaborator.userId;

    if (collaborator.inviteExpiresAt && collaborator.inviteExpiresAt.toDate() < new Date()) {
        throw new Error('Convite expirou.');
    }
    if (collaborator.teamMemberUid) {
        throw new Error('Este convite já foi aceito e vinculado a uma conta.');
    }

    // Cria o usuário no Firebase Auth
    const newUserRecord = await authAdmin.createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: true, // Pode começar como verificado, já que veio de um convite
    });
    
    const batch = dbAdmin.batch();

    // Cria o documento do SystemUser para o novo membro
    const userDocRef = dbAdmin.collection('users').doc(newUserRecord.uid);
    batch.set(userDocRef, {
      uid: newUserRecord.uid,
      name: name,
      email: email,
      photoURL: null,
      companyName: collaborator.companyName || null, // Pega da conta principal se existir
      role: 'team_member',
      mainAccountId: mainAccountId,
      planId: null, // Membros de equipe não têm plano próprio
      subscriptionStatus: null,
    });

    // Atualiza o documento do colaborador original para vincular o novo usuário
    const collaboratorRef = dbAdmin.collection('collaborators').doc(collaboratorId);
    batch.update(collaboratorRef, {
      teamMemberUid: newUserRecord.uid,
      inviteToken: FieldValue.delete(), // Usa FieldValue.delete() para remover os campos
      inviteExpiresAt: FieldValue.delete(),
    });
    
    await batch.commit();

    return { success: true, message: 'Cadastro realizado com sucesso! Você já pode fazer o login.' };

  } catch (error: any) {
    console.error('Erro no registro do membro:', error);
    // Verifica se o e-mail já existe
    if (error.code === 'auth/email-already-exists') {
        return { success: false, message: 'Este e-mail já está sendo usado por outra conta.' };
    }
    return { success: false, message: error.message || 'Ocorreu uma falha durante o cadastro.' };
  }
} 