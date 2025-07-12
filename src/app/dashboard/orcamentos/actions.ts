
'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote, ServiceOrder } from '@/types';

export async function convertQuoteToServiceOrder(quoteId: string, userId: string) {
    if (!quoteId || !userId) {
        return { success: false, message: 'ID do orçamento ou do usuário ausente.' };
    }
    
    try {
        const quoteRef = doc(db, 'quotes', quoteId);
        const quoteSnap = await getDoc(quoteRef);

        if (!quoteSnap.exists() || quoteSnap.data().userId !== userId) {
            throw new Error('Orçamento não encontrado ou pertence a outro usuário.');
        }

        const quote = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;

        if (quote.status !== 'Aprovado') {
            throw new Error('Apenas orçamentos aprovados podem ser convertidos.');
        }

        const serviceOrderData: Omit<ServiceOrder, 'id'> = {
            clientId: quote.clientId,
            clientName: quote.clientName,
            problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
            serviceType: quote.title,
            status: 'Pendente',
            collaboratorId: '',
            dueDate: Timestamp.fromDate(new Date()),
            totalValue: quote.totalValue,
            attachments: [],
            userId: userId,
            createdAt: Timestamp.now(),
            customFields: quote.customFields || {},
            completedAt: null,
            isTemplate: false,
            activityLog: [{
                timestamp: Timestamp.now(),
                userEmail: '', // This should be populated by the calling context
                description: `Ordem de Serviço criada a partir do orçamento #${quote.id.substring(0, 6).toUpperCase()}`
            }],
        };

        const docRef = await addDoc(collection(db, 'serviceOrders'), serviceOrderData);
        
        const logEntry = {
          timestamp: Timestamp.now(),
          userEmail: '',
          description: `Orçamento convertido para a OS #${docRef.id.substring(0,6).toUpperCase()}`
        };

        await updateDoc(quoteRef, { 
            status: 'Convertido',
            convertedToServiceOrderId: docRef.id, 
            activityLog: arrayUnion(logEntry) 
        });

        return { success: true, serviceOrderId: docRef.id };

    } catch (error) {
        console.error("Conversion error:", error);
        return { success: false, message: (error as Error).message || 'Falha ao converter o orçamento.' };
    }
}
