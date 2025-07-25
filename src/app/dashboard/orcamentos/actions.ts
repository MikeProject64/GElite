
'use server';

import { db } from '@/lib/firebase';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/server-auth';
import type { Quote, ServiceOrder } from '@/types';
import { collection, doc, writeBatch, Timestamp, arrayUnion, runTransaction } from 'firebase/firestore';

/**
 * Updates the status for multiple quotes in a single batch.
 * @param quoteIds An array of quote IDs to update.
 * @param newStatus The new status to set.
 */
export async function bulkUpdateQuoteStatus(quoteIds: string[], newStatus: Quote['status']): Promise<{ success: boolean; message?: string }> {
  if (!quoteIds || quoteIds.length === 0) {
    return { success: false, message: 'Nenhum orçamento selecionado.' };
  }
  
  try {
    const { uid: adminUid, userDoc } = await verifyAdmin();
    const adminEmail = userDoc.data()?.email || 'Admin';

    const batch = writeBatch(db);
    const logEntry = {
        timestamp: Timestamp.now(),
        userEmail: adminEmail,
        description: `Status alterado para "${newStatus}" em ação massiva.`
      };

    quoteIds.forEach(id => {
      const docRef = doc(db, 'quotes', id);
      batch.update(docRef, { status: newStatus, activityLog: arrayUnion(logEntry) });
    });

    await batch.commit();
    return { success: true, message: `${quoteIds.length} orçamento(s) atualizado(s) com sucesso.` };
  } catch (error: any) {
    console.error("Error bulk updating quote status:", error);
    return { success: false, message: error.message || 'Falha ao atualizar orçamentos.' };
  }
}

/**
 * Deletes multiple quotes in a single batch.
 * @param quoteIds An array of quote IDs to delete.
 */
export async function bulkDeleteQuotes(quoteIds: string[]): Promise<{ success: boolean; message?: string }> {
  if (!quoteIds || quoteIds.length === 0) {
    return { success: false, message: 'Nenhum orçamento selecionado.' };
  }

  try {
    await verifyAdmin();
    const batch = writeBatch(db);

    quoteIds.forEach(id => {
      const docRef = doc(db, 'quotes', id);
      batch.delete(docRef);
    });

    await batch.commit();
    return { success: true, message: `${quoteIds.length} orçamento(s) excluído(s) com sucesso.` };
  } catch (error: any) {
    console.error("Error bulk deleting quotes:", error);
    return { success: false, message: error.message || 'Falha ao excluir orçamentos.' };
  }
}

/**
 * Converts multiple approved quotes into service orders.
 * @param quoteIds An array of quote IDs to convert.
 */
export async function bulkConvertQuotesToServiceOrders(quoteIds: string[]): Promise<{ success: boolean; message?: string; convertedCount?: number; errorCount?: number; }> {
  if (!quoteIds || quoteIds.length === 0) {
    return { success: false, message: 'Nenhum orçamento selecionado.' };
  }
  
  let convertedCount = 0;
  const errors: string[] = [];

  try {
    const { uid: adminUid, userDoc } = await verifyAdmin();
    const adminEmail = userDoc.data()?.email || 'Admin';

    for (const quoteId of quoteIds) {
      await runTransaction(db, async (transaction) => {
        const quoteRef = doc(db, 'quotes', quoteId);
        const quoteSnap = await transaction.get(quoteRef);

        if (!quoteSnap.exists()) {
          errors.push(`Orçamento ${quoteId.substring(0,6)} não encontrado.`);
          return;
        }

        const quote = quoteSnap.data() as Quote;

        if (quote.status !== 'Aprovado') {
          errors.push(`Orçamento ${quote.id.substring(0,6)} não está aprovado.`);
          return;
        }
        if (quote.convertedToServiceOrderId) {
          errors.push(`Orçamento ${quote.id.substring(0,6)} já foi convertido.`);
          return;
        }

        const newServiceOrderRef = doc(collection(db, 'serviceOrders'));
        const serviceOrderData: Omit<ServiceOrder, 'id'> = {
          userId: quote.userId,
          clientId: quote.clientId,
          clientName: quote.clientName,
          serviceType: quote.title,
          problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
          collaboratorId: '', 
          collaboratorName: '',
          totalValue: quote.totalValue,
          status: 'Pendente',
          priority: 'media',
          dueDate: Timestamp.now(), // Default due date, can be edited later
          attachments: [],
          createdAt: Timestamp.now(),
          completedAt: null,
          customFields: quote.customFields || {},
          activityLog: [{
            timestamp: Timestamp.now(),
            userEmail: adminEmail,
            description: `Ordem de Serviço criada a partir do orçamento #${quote.id.substring(0,6).toUpperCase()}`
          }],
          isTemplate: false,
          originalServiceOrderId: newServiceOrderRef.id,
          version: 1,
          source: { type: 'quote', id: quote.id },
        };
        transaction.set(newServiceOrderRef, serviceOrderData);

        const logEntry = {
          timestamp: Timestamp.now(),
          userEmail: adminEmail,
          description: `Orçamento convertido para a OS #${newServiceOrderRef.id.substring(0,6).toUpperCase()}`
        };
        transaction.update(quoteRef, {
          status: 'Convertido',
          convertedToServiceOrderId: newServiceOrderRef.id,
          activityLog: arrayUnion(logEntry)
        });
        
        convertedCount++;
      });
    }

    let message = `${convertedCount} orçamento(s) convertido(s) com sucesso.`;
    if (errors.length > 0) {
      message += ` ${errors.length} falharam.`;
    }

    return { success: true, message, convertedCount, errorCount: errors.length };
  } catch (error: any) {
    console.error("Error bulk converting quotes:", error);
    return { success: false, message: error.message || 'Falha ao converter orçamentos.' };
  }
}
