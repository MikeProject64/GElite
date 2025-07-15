'use server';

import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdminApp, dbAdmin } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/server-auth';

/**
 * Cria um token de login customizado para um usuário específico, permitindo que um admin
 * se passe por esse usuário.
 * @param uid O ID do usuário a ser impersonado.
 * @returns Um objeto com sucesso e o token, ou uma mensagem de erro.
 */
export async function createImpersonationToken(uid: string): Promise<{ success: boolean; token?: string; message?: string; }> {
  try {
    await verifyAdmin(); // Protege a ação
    await initFirebaseAdminApp();
    
    if (!uid) {
      throw new Error('O UID do usuário é obrigatório.');
    }

    const customToken = await getAuth().createCustomToken(uid);
    
    return { success: true, token: customToken };

  } catch (error: any) {
    console.error('Erro ao criar token de impersonação:', error);
    return { success: false, message: error.message || 'Ocorreu um erro inesperado no servidor.' };
  }
}

/**
 * Exclui múltiplos usuários do Firebase Auth e do Firestore.
 * @param uids Array de UIDs dos usuários a serem excluídos.
 */
export async function deleteUsers(uids: string[]): Promise<{ success: boolean; message?: string; }> {
  try {
    await verifyAdmin(); // Protege a ação
    await initFirebaseAdminApp();
    if (!uids || uids.length === 0) throw new Error("Nenhum UID de usuário fornecido.");

    // Excluir do Firebase Auth (em lotes de 1000, que é o máximo)
    await getAuth().deleteUsers(uids);

    // Excluir do Firestore usando Batched Write (lotes de 500)
    const batch = dbAdmin.batch();
    uids.forEach(uid => {
      const userRef = dbAdmin.collection('users').doc(uid);
      batch.delete(userRef);
    });
    
    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao excluir usuários em lote:', error);
    return { success: false, message: error.message || 'Falha ao excluir usuários.' };
  }
}

/**
 * Atualiza a permissão (role) de múltiplos usuários.
 * @param uids Array de UIDs dos usuários.
 * @param role A nova permissão.
 */
export async function updateUsersRole(uids: string[], role: 'admin' | 'user'): Promise<{ success: boolean; message?: string; }> {
   try {
    await verifyAdmin(); // Protege a ação
    await initFirebaseAdminApp();
    if (!uids || uids.length === 0) throw new Error("Nenhum UID de usuário fornecido.");

    const batch = dbAdmin.batch();
    uids.forEach(uid => {
      const userRef = dbAdmin.collection('users').doc(uid);
      batch.update(userRef, { role });
    });
    
    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar permissões em lote:', error);
    return { success: false, message: error.message || 'Falha ao atualizar permissões.' };
  }
}

/**
 * Atualiza o plano de múltiplos usuários.
 * @param uids Array de UIDs dos usuários.
 * @param planId O ID do novo plano.
 */
export async function updateUsersPlan(uids: string[], planId: string): Promise<{ success: boolean; message?: string; }> {
   try {
    await verifyAdmin(); // Protege a ação
    await initFirebaseAdminApp();
    if (!uids || uids.length === 0) throw new Error("Nenhum UID de usuário fornecido.");

    const batch = dbAdmin.batch();
    uids.forEach(uid => {
      const userRef = dbAdmin.collection('users').doc(uid);
      batch.update(userRef, { 
        planId: planId,
        subscriptionId: null,
        subscriptionStatus: 'active',
        trialStartedAt: null,
        trialEndsAt: null,
      });
    });
    
    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar planos em lote:', error);
    return { success: false, message: error.message || 'Falha ao atualizar planos.' };
  }
} 