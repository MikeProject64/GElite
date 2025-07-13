

'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, arrayUnion, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote, ServiceOrder, SystemUser } from '@/types';

export async function convertQuoteToServiceOrder(quoteId: string, userId: string, userEmail?: string) {
    if (!quoteId || !userId) {
        return { success: false, message: 'ID do orçamento ou do usuário ausente.' };
    }
    
    try {
        let finalUserEmail = userEmail;
        if (!finalUserEmail) {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if(userSnap.exists()){
                finalUserEmail = (userSnap.data() as SystemUser).email;
            } else {
                throw new Error('Usuário não encontrado para registrar a ação.');
            }
        }
        
        const quoteRef = doc(db, 'quotes', quoteId);
        let serviceOrderId = '';

        await runTransaction(db, async (transaction) => {
            const quoteSnap = await transaction.get(quoteRef);
            if (!quoteSnap.exists() || quoteSnap.data().userId !== userId) {
                throw new Error('Orçamento não encontrado ou pertence a outro usuário.');
            }

            const quote = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;

            if (quote.status !== 'Aprovado') {
                throw new Error('Apenas orçamentos aprovados podem ser convertidos.');
            }
            
            if (quote.convertedToServiceOrderId) {
                throw new Error('Este orçamento já foi convertido em uma Ordem de Serviço.');
            }

            const newServiceOrderRef = doc(collection(db, 'serviceOrders'));
            serviceOrderId = newServiceOrderRef.id;

            // This is the corrected and complete object for the new ServiceOrder.
            // It now includes all necessary fields with default values.
            const serviceOrderData: Omit<ServiceOrder, 'id'> = {
                userId: userId, // CRITICAL: Ensure userId is set correctly for Firestore rules
                clientId: quote.clientId,
                clientName: quote.clientName,
                serviceType: quote.title,
                problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
                collaboratorId: '', // Default value
                collaboratorName: '', // Default value
                totalValue: quote.totalValue,
                status: 'Pendente', // Default status
                priority: 'media', // Default priority
                dueDate: Timestamp.fromDate(new Date()), // Default due date
                attachments: [], // Default empty array
                createdAt: Timestamp.now(),
                completedAt: null, // Default null value
                customFields: quote.customFields || {},
                activityLog: [{
                    timestamp: Timestamp.now(),
                    userEmail: finalUserEmail,
                    description: `Ordem de Serviço criada a partir do orçamento #${quote.id.substring(0,6).toUpperCase()}`
                }],
                isTemplate: false,
                originalServiceOrderId: newServiceOrderRef.id, // Set self as original
                version: 1,
            };

            transaction.set(newServiceOrderRef, serviceOrderData);

            const logEntry = {
              timestamp: Timestamp.now(),
              userEmail: finalUserEmail,
              description: `Orçamento convertido para a OS #${serviceOrderId.substring(0,6).toUpperCase()}`
            };

            transaction.update(quoteRef, { 
                status: 'Convertido',
                convertedToServiceOrderId: serviceOrderId,
                activityLog: arrayUnion(logEntry) 
            });
        });

        return { success: true, serviceOrderId };

    } catch (error) {
        console.error("Conversion error:", error);
        return { success: false, message: (error as Error).message || 'Falha ao converter o orçamento.' };
    }
}
