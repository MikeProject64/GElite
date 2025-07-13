

'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, arrayUnion, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote, ServiceOrder, SystemUser } from '@/types';

export async function convertQuoteToServiceOrder(quoteId: string, userId: string, userEmail?: string) {
    if (!quoteId || !userId) {
        return { success: false, message: 'ID do orçamento ou do usuário ausente.' };
    }

    const quoteRef = doc(db, 'quotes', quoteId);
    
    try {
        // Step 1: Validate permissions BEFORE any write operations
        const quoteSnap = await getDoc(quoteRef);

        if (!quoteSnap.exists()) {
            throw new Error('Orçamento não encontrado.');
        }

        const quote = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;

        // Security check: ensure the user owns the quote.
        if (quote.userId !== userId) {
            throw new Error('Você não tem permissão para converter este orçamento.');
        }
        
        if (quote.status !== 'Aprovado') {
            throw new Error('Apenas orçamentos aprovados podem ser convertidos.');
        }
        
        if (quote.convertedToServiceOrderId) {
            throw new Error('Este orçamento já foi convertido em uma Ordem de Serviço.');
        }

        // Step 2: Create the new Service Order document
        const newServiceOrderRef = doc(collection(db, 'serviceOrders'));
        const serviceOrderId = newServiceOrderRef.id;

        const serviceOrderData: Omit<ServiceOrder, 'id'> = {
            userId: userId, // CRITICAL: Set userId for security rules
            clientId: quote.clientId,
            clientName: quote.clientName,
            serviceType: quote.title,
            problemDescription: `${quote.description}\n\n---\nServiço baseado no orçamento #${quote.id.substring(0, 6).toUpperCase()} (v${quote.version || 1})`,
            collaboratorId: '', 
            collaboratorName: '',
            totalValue: quote.totalValue,
            status: 'Pendente',
            priority: 'media',
            dueDate: Timestamp.fromDate(new Date()),
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
        
        await setDoc(newServiceOrderRef, serviceOrderData);

        // Step 3: Update the original Quote document
        const logEntry = {
            timestamp: Timestamp.now(),
            userEmail: userEmail || 'Sistema',
            description: `Orçamento convertido para a OS #${serviceOrderId.substring(0,6).toUpperCase()}`
        };

        await updateDoc(quoteRef, { 
            status: 'Convertido',
            convertedToServiceOrderId: serviceOrderId,
            activityLog: arrayUnion(logEntry) 
        });

        return { success: true, serviceOrderId };

    } catch (error) {
        console.error("Conversion error:", error);
        return { success: false, message: (error as Error).message || 'Falha ao converter o orçamento.' };
    }
}
