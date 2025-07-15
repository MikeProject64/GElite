
import { cookies } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

/**
 * Verifies the user's session from the request cookies on the server-side
 * and checks if they have the 'admin' role.
 * 
 * This function should be called at the beginning of any Server Action
 * or Route Handler that requires administrator privileges.
 * 
 * @returns {Promise<{uid: string, userDoc: FirebaseFirestore.DocumentSnapshot}>} 
 *          An object containing the admin's UID and their Firestore document.
 * @throws  {Error} If the user is not authenticated, the session is invalid,
 *          the user document doesn't exist, or the user is not an admin.
 */
export async function verifyAdmin() {
  const { adminAuth, dbAdmin } = await getFirebaseAdmin();
  const sessionCookie = cookies().get('session')?.value;

  if (!sessionCookie) {
    throw new Error('Não autenticado. Nenhum cookie de sessão encontrado.');
  }

  let decodedIdToken;
  try {
    decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    throw new Error('Sessão inválida ou expirada. Faça login novamente.');
  }

  const { uid } = decodedIdToken;
  const userDoc = await dbAdmin.collection('users').doc(uid).get();

  if (!userDoc.exists) {
    throw new Error('Usuário não encontrado no banco de dados.');
  }

  if (userDoc.data()?.role !== 'admin') {
    throw new Error('Acesso negado. Requer privilégios de administrador.');
  }

  return { uid, userDoc };
} 