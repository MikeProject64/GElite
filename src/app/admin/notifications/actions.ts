'use client';

// Removendo as importações do Firebase Admin SDK e usando o SDK do cliente
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  getDocs, 
  query 
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Importando a instância do DB do cliente
import type { AdminNotification } from '@/types';

type NotificationData = {
  title: string;
  message: string;
  target: 'all' | 'specific';
  specificUsers?: string[];
  actionUrl?: string;
  actionText?: string;
};

// A função agora é executada no cliente e não precisa mais do token de autenticação
export async function sendNotification(
  data: NotificationData
): Promise<{ success: boolean; message?: string }> {
  console.log('\n---[Client-side sendNotification Action Started]---');
  try {
    const batch = writeBatch(db);
    const newNotificationRef = doc(collection(db, 'admin_notifications'));
    let targetUids: string[] = [];

    if (data.target === 'all') {
      // Como admin, o usuário tem permissão para listar todos os outros usuários
      const usersSnapshot = await getDocs(collection(db, 'users'));
      targetUids = usersSnapshot.docs.map((doc) => doc.id);
    } else {
      targetUids = data.specificUsers || [];
    }

    if (targetUids.length === 0) {
      throw new Error('Nenhum usuário de destino foi especificado.');
    }
    console.log(`[LOG] Notification will be sent to ${targetUids.length} users.`);

    // 1. Criamos o registro central da notificação para referência do admin.
    const mainNotification: Omit<AdminNotification, 'id' | 'createdAt'> & { createdAt: any } = {
      title: data.title,
      message: data.message,
      target: data.target,
      sentTo: targetUids, // Armazenamos para quem foi enviado, crucial para editar/deletar
      status: 'sent',
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      createdAt: serverTimestamp(),
    };
    batch.set(newNotificationRef, mainNotification as any);


    // 2. Copiamos os dados para a subcoleção de cada usuário (desnormalização).
    targetUids.forEach((uid) => {
      const userNotificationRef = doc(
        db,
        'users',
        uid,
        'notifications',
        newNotificationRef.id
      );
      // Copiamos os dados principais da notificação para a subcoleção do usuário.
      // Isso evita a necessidade de o cliente ler a coleção 'admin_notifications',
      // resolvendo o problema de permissão.
      batch.set(userNotificationRef, { 
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl || null,
        actionText: data.actionText || null,
        createdAt: serverTimestamp(),
        read: false, 
        readAt: null 
      });
    });

    console.log('[LOG] Attempting to commit batch...');
    await batch.commit();
    console.log('---[Batch Commit Successful]---');

    return { success: true, message: 'Notificação enviada com sucesso!' };
  } catch (error: any) {
    console.error('---[ERROR in sendNotification Action]---');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Error Object:', error);
    // As regras de segurança do Firestore fornecerão um erro claro se a permissão for negada
    const defaultMessage = 'Ocorreu um erro desconhecido ao enviar a notificação.';
    const firebaseErrorMessages: { [key: string]: string } = {
        'permission-denied': 'Permissão negada. Verifique se você tem privilégios de administrador.'
    };
    return {
      success: false,
      message: firebaseErrorMessages[error.code] || error.message || defaultMessage,
    };
  }
}

type UpdateData = Omit<NotificationData, 'target' | 'specificUsers'>;

export async function updateNotification(
  notificationId: string,
  sentTo: string[],
  data: UpdateData
): Promise<{ success: boolean; message?: string }> {
  try {
    const batch = writeBatch(db);

    // 1. Atualiza o documento principal em 'admin_notifications'
    const mainNotifRef = doc(db, 'admin_notifications', notificationId);
    batch.update(mainNotifRef, {
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl || null,
      actionText: data.actionText || null,
    });

    // 2. Atualiza cada notificação na subcoleção dos usuários
    sentTo.forEach((uid) => {
      const userNotifRef = doc(db, 'users', uid, 'notifications', notificationId);
      batch.update(userNotifRef, {
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl || null,
        actionText: data.actionText || null,
      });
    });

    await batch.commit();
    return { success: true, message: 'Notificação atualizada com sucesso!' };
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return { success: false, message: 'Falha ao atualizar a notificação.' };
  }
}

export async function deleteNotification(
  notificationId: string,
  sentTo: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const batch = writeBatch(db);

    // 1. Apaga o documento principal
    const mainNotifRef = doc(db, 'admin_notifications', notificationId);
    batch.delete(mainNotifRef);

    // 2. Apaga cada notificação da subcoleção dos usuários
    sentTo.forEach((uid) => {
      const userNotifRef = doc(db, 'users', uid, 'notifications', notificationId);
      batch.delete(userNotifRef);
    });

    await batch.commit();
    return { success: true, message: 'Notificação apagada com sucesso!' };
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return { success: false, message: 'Falha ao apagar a notificação.' };
  }
} 