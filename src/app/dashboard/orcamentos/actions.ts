

'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, arrayUnion, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote, ServiceOrder, SystemUser } from '@/types';

export async function convertQuoteToServiceOrder(quoteId: string, userId: string, userEmail?: string) {
    if (!quoteId || !userId) {
        return { success: false, message: 'ID do orçamento ou do usuário ausente.' };
    }
    
    const quoteRef = doc(db, 'quotes', quoteId);
    const serviceOrderCollectionRef = collection(db, 'serviceOrders');

    try {
        // First, fetch the quote outside the transaction to perform checks.
        const quoteSnap = await getDoc(quoteRef);

        if (!quoteSnap.exists()) {
            throw new Error('Orçamento não encontrado.');
        }

        const quote = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;

        // Perform security check: ensure the user owns the quote.
        if (quote.userId !== userId) {
            throw new Error('Você não tem permissão para converter este orçamento.');
        }
        
        if (quote.status !== 'Aprovado') {
            throw new Error('Apenas orçamentos aprovados podem ser convertidos.');
        }
        
        if (quote.convertedToServiceOrderId) {
            throw new Error('Este orçamento já foi convertido em uma Ordem de Serviço.');
        }

        let serviceOrderId = '';

        await runTransaction(db, async (transaction) => {
            const newServiceOrderRef = doc(serviceOrderCollectionRef);
            serviceOrderId = newServiceOrderRef.id;

            const serviceOrderData: Omit<ServiceOrder, 'id'> = {
                userId: userId, // Critical: Set userId for security rules
                clientId: quote.clientId,
                clientName: quote.clientName,
                serviceType: quote.title,
                problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
                collaboratorId: '', 
                collaboratorName: '',
                totalValue: quote.totalValue,
                status: 'Pendente', // Always starts as pending
                priority: 'media',
                dueDate: Timestamp.fromDate(new Date()), // Defaults to today, can be changed later
                attachments: [],
                createdAt: Timestamp.now(),
                completedAt: null,
                customFields: quote.customFields || {},
                activityLog: [{
                    timestamp: Timestamp.now(),
                    userEmail: userEmail || 'Sistema',
                    description: `Ordem de Serviço criada a partir do orçamento #${quote.id.substring(0,6).toUpperCase()}`
                }],
                isTemplate: false,
                originalServiceOrderId: newServiceOrderRef.id,
                version: 1,
            };
            
            // Set the new Service Order
            transaction.set(newServiceOrderRef, serviceOrderData);

            // Update the original Quote
            const logEntry = {
              timestamp: Timestamp.now(),
              userEmail: userEmail || 'Sistema',
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
