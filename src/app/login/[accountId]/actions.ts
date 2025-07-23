'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function getAccountInfo(accountId: string): Promise<{ 
  success: boolean; 
  message: string; 
  accountOwnerName?: string;
  companyName?: string;
}> {
  if (!accountId) {
    return { success: false, message: 'ID da conta não fornecido.' };
  }

  try {
    const { dbAdmin } = await getFirebaseAdmin();
    const mainAccountDoc = await dbAdmin.collection('users').doc(accountId).get();
    
    if (!mainAccountDoc.exists) {
        return { success: false, message: 'A conta especificada no link de login não foi encontrada.' };
    }
    const mainAccountData = mainAccountDoc.data();

    // Verificamos se a conta é realmente uma conta principal
    if (mainAccountData?.role === 'team_member') {
        return { success: false, message: 'O link de login deve apontar para uma conta principal, não de um membro da equipe.' };
    }

    return { 
      success: true, 
      message: 'Conta encontrada.', 
      accountOwnerName: mainAccountData?.name,
      companyName: mainAccountData?.companyName,
    };
  } catch (error) {
    console.error('Erro ao buscar informações da conta:', error);
    return { success: false, message: 'Ocorreu um erro ao verificar as informações da conta.' };
  }
} 