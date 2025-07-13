

'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote, ServiceOrder, SystemUser } from '@/types';

export async function convertQuoteToServiceOrder(quoteId: string, userId: string, userEmail?: string) {
    console.log(`[CONVERT_QUOTE] Function started for quoteId: ${quoteId} by userId: ${userId}`);

    if (!quoteId || !userId) {
        console.error('[CONVERT_QUOTE] ERROR: Missing quoteId or userId.');
        return { success: false, message: 'ID do orçamento ou do usuário ausente.' };
    }

    const quoteRef = doc(db, 'quotes', quoteId);
    
    try {
        // Step 1: Validate permissions BEFORE any write operations
        console.log(`[CONVERT_QUOTE] Fetching quote document from ref: ${quoteRef.path}`);
        const quoteSnap = await getDoc(quoteRef);

        if (!quoteSnap.exists()) {
            console.error(`[CONVERT_QUOTE] ERROR: Quote document not found at path: ${quoteRef.path}`);
            throw new Error('Orçamento não encontrado.');
        }

        const quote = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;
        console.log(`[CONVERT_QUOTE] Quote document found. Owner userId is: ${quote.userId}`);

        // Security check: ensure the user owns the quote.
        if (quote.userId !== userId) {
            console.error(`[CONVERT_QUOTE] PERMISSION_DENIED: User ${userId} does not own quote ${quoteId} (owner is ${quote.userId}).`);
            throw new Error('Você não tem permissão para converter este orçamento.');
        }
        console.log('[CONVERT_QUOTE] Permission check passed.');
        
        if (quote.status !== 'Aprovado') {
             console.error(`[CONVERT_QUOTE] ERROR: Quote status is "${quote.status}", not "Aprovado".`);
            throw new Error('Apenas orçamentos aprovados podem ser convertidos.');
        }
        
        if (quote.convertedToServiceOrderId) {
            console.error(`[CONVERT_QUOTE] ERROR: Quote already converted to OS ID: ${quote.convertedToServiceOrderId}.`);
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
            generatedByAgreementId: quote.id,
        };
        
        console.log('[CONVERT_QUOTE] Preparing to create new Service Order with payload:', serviceOrderData);
        await setDoc(newServiceOrderRef, serviceOrderData);
        console.log(`[CONVERT_QUOTE] Successfully created new Service Order with ID: ${serviceOrderId}`);


        // Step 3: Update the original Quote document
        const logEntry = {
            timestamp: Timestamp.now(),
            userEmail: userEmail || 'Sistema',
            description: `Orçamento convertido para a OS #${serviceOrderId.substring(0,6).toUpperCase()}`
        };

        console.log(`[CONVERT_QUOTE] Preparing to update original quote ${quote.id}.`);
        await updateDoc(quoteRef, { 
            status: 'Convertido',
            convertedToServiceOrderId: serviceOrderId,
            activityLog: arrayUnion(logEntry) 
        });
        console.log(`[CONVERT_QUOTE] Successfully updated original quote.`);

        return { success: true, serviceOrderId };

    } catch (error) {
        console.error("[CONVERT_QUOTE] CATCH BLOCK: An error occurred during conversion.", error);
        return { success: false, message: (error as Error).message || 'Falha ao converter o orçamento.' };
    }
}
