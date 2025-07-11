
'use server';

import { collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ServiceAgreement, ServiceOrder } from '@/types';
import { addMonths, addQuarters, addYears } from 'date-fns';

/**
 * Checks for active service agreements that are due and generates new service orders.
 * This function is designed to be called periodically (e.g., daily) by a scheduler.
 */
export async function processServiceAgreements(): Promise<{ success: boolean; generated: number; message: string }> {
  console.log('Starting to process service agreements...');
  const now = new Date();
  const todayTimestamp = Timestamp.fromDate(now);

  const agreementsQuery = query(
    collection(db, 'serviceAgreements'),
    where('status', '==', 'active'),
    where('nextDueDate', '<=', todayTimestamp)
  );

  try {
    const querySnapshot = await getDocs(agreementsQuery);
    if (querySnapshot.empty) {
      const message = 'No due service agreements to process.';
      console.log(message);
      return { success: true, generated: 0, message };
    }

    const batch = writeBatch(db);
    let generatedCount = 0;

    for (const docSnap of querySnapshot.docs) {
      const agreement = { id: docSnap.id, ...docSnap.data() } as ServiceAgreement;

      // Fetch the service order template
      const templateRef = doc(db, 'serviceOrders', agreement.serviceOrderTemplateId);
      const templateSnap = await getDoc(templateRef);

      if (!templateSnap.exists()) {
        console.warn(`Template ${agreement.serviceOrderTemplateId} not found for agreement ${agreement.id}. Skipping.`);
        continue;
      }
      const templateData = templateSnap.data() as ServiceOrder;

      // Create new service order from template
      const newServiceOrderRef = doc(collection(db, 'serviceOrders'));
      const newServiceOrder: Omit<ServiceOrder, 'id'> = {
        ...templateData,
        clientId: agreement.clientId,
        clientName: agreement.clientName,
        status: 'Pendente', // Always start as pending
        createdAt: Timestamp.now(),
        dueDate: agreement.nextDueDate,
        isTemplate: false,
        generatedByAgreementId: agreement.id,
        activityLog: [{
          timestamp: Timestamp.now(),
          userEmail: 'Sistema',
          description: `Ordem de Serviço gerada automaticamente pelo contrato #${agreement.id.substring(0, 6).toUpperCase()}.`,
        }],
      };
      
      // Remove fields that should not be copied from a template
      delete (newServiceOrder as any).templateName;

      batch.set(newServiceOrderRef, newServiceOrder);

      // Calculate next due date
      const currentDueDate = agreement.nextDueDate.toDate();
      let nextDueDate: Date;
      switch (agreement.frequency) {
        case 'monthly':
          nextDueDate = addMonths(currentDueDate, 1);
          break;
        case 'quarterly':
          nextDueDate = addQuarters(currentDueDate, 1);
          break;
        case 'semiannually':
          nextDueDate = addMonths(currentDueDate, 6);
          break;
        case 'annually':
          nextDueDate = addYears(currentDueDate, 1);
          break;
        default:
          throw new Error(`Unknown frequency: ${agreement.frequency}`);
      }

      // Update the agreement
      const agreementRef = doc(db, 'serviceAgreements', agreement.id);
      batch.update(agreementRef, {
        nextDueDate: Timestamp.fromDate(nextDueDate),
        lastGeneratedAt: Timestamp.now(),
      });
      
      generatedCount++;
    }

    if (generatedCount > 0) {
        await batch.commit();
    }
    
    const successMessage = `Successfully processed ${querySnapshot.size} agreements, generated ${generatedCount} new service orders.`;
    console.log(successMessage);
    return { success: true, generated: generatedCount, message: successMessage };

  } catch (error: any) {
    console.error('Error processing service agreements:', error);
    return { success: false, generated: 0, message: `Error: ${error.message}` };
  }
}
