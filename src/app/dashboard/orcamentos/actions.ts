

'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote, ServiceOrder, SystemUser } from '@/types';

export async function convertQuoteToServiceOrder(quoteId: string, userId: string, userEmail?: string) {
    if (!quoteId || !userId) {
        return { success: false, message: 'ID do orçamento ou do usuário ausente.' };
    }
    
    try {
        let finalUserEmail = userEmail;
        // If email isn't passed, fetch it as a fallback to ensure permission
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
        const quoteSnap = await getDoc(quoteRef);

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

        const serviceOrderData: Omit<ServiceOrder, 'id'> = {
            clientId: quote.clientId,
            clientName: quote.clientName,
            problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
            serviceType: quote.title,
            status: 'Pendente', // Default status for new OS
            priority: 'media', // Default priority
            collaboratorId: '', // To be assigned later
            collaboratorName: '', // To be assigned later
            dueDate: Timestamp.fromDate(new Date()), // Default to today, user should update
            totalValue: quote.totalValue,
            attachments: [], // Start with empty attachments
            userId: userId,
            createdAt: Timestamp.now(),
            customFields: quote.customFields || {},
            completedAt: null,
            isTemplate: false,
            activityLog: [{
                timestamp: Timestamp.now(),
                userEmail: finalUserEmail,
                description: `Ordem de Serviço criada a partir do orçamento #${quote.id.substring(0,6).toUpperCase()}`
            }],
        };

        const docRef = await addDoc(collection(db, 'serviceOrders'), serviceOrderData);
        
        const logEntry = {
          timestamp: Timestamp.now(),
          userEmail: finalUserEmail,
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
