
'use server';

import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase-admin';


/**
 * Cria um cookie de sessão para o usuário autenticado.
 * @param idToken O token de ID do Firebase do cliente.
 * @returns Um objeto indicando sucesso ou falha.
 */
export async function createSessionCookie(idToken: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { adminAuth } = await getFirebaseAdmin();
    
    // Opcional: Verificar se o usuário é admin antes de criar uma sessão privilegiada
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const user = await adminAuth.getUser(decodedToken.uid);
    
    if (user.customClaims?.['role'] !== 'admin') {
         // Se você quiser ser ainda mais seguro, pode definir a role como uma custom claim no Firebase
         // e verificá-la aqui, antes mesmo de criar o cookie de sessão para a área de admin.
         // Por enquanto, vamos confiar na verificação da role do Firestore que já temos.
    }

    // 5 dias de validade para o cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Define o cookie na resposta. `secure: true` é crucial para produção.
    cookies().set('session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    
    return { success: true };
  } catch (error: any) {
    console.error('Falha ao criar cookie de sessão:', error);
    return { success: false, message: error.message || 'Não foi possível criar a sessão.' };
  }
}

/**
 * Limpa o cookie de sessão do navegador.
 */
export async function clearSessionCookie() {
  try {
    cookies().delete('session');
    return { success: true };
  } catch (error: any) {
    console.error('Falha ao limpar cookie de sessão:', error);
    return { success: false, message: 'Não foi possível encerrar a sessão.' };
  }
}
