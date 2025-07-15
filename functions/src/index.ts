/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Define the structure for SMTP settings for type safety
interface SmtpConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  fromName?: string;
  fromEmail?: string;
}

interface TemplateData {
  subject: string;
  htmlContent: string;
}

interface ListData {
  emails: string[];
}

// Cloud Function to process email queue
export const processEmailQueue = onDocumentCreated("emailQueue/{jobId}",
  async (event) => {
    const jobData = event.data?.data();
    const jobId = event.params.jobId;

    if (!jobData) {
      logger.error(`[${jobId}] No data associated with the event.`);
      return;
    }

    logger.info(
      `[${jobId}] Starting email queue processing...`, {jobData},
    );

    const {templateId, listIds} = jobData;

    // Mark job as 'processing'
    const jobRef = db.collection("emailQueue").doc(jobId);
    const recipientsRef = jobRef.collection("recipients");

    await jobRef.update({
      status: "processing",
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      // 1. Fetch SMTP configuration
      const configRef = db.collection("integrations").doc("email");
      const configSnap = await configRef.get();
      const smtpConfig: SmtpConfig = configSnap.data() || {};

      if (
        !smtpConfig.smtpHost ||
        !smtpConfig.smtpPort ||
        !smtpConfig.smtpUser ||
        !smtpConfig.smtpPass
      ) {
        throw new Error("SMTP configuration is incomplete.");
      }

      // 2. Fetch email template
      const templateRef = db.collection("emailTemplates").doc(templateId);
      const templateSnap = await templateRef.get();
      if (!templateSnap.exists) {
        throw new Error(`Email template with ID ${templateId} not found.`);
      }
      const {subject, htmlContent} = templateSnap.data() as TemplateData;

      // 3. Fetch all emails from the selected lists
      let allEmails: string[] = [];
      for (const listId of listIds) {
        const listRef = db.collection("emailLists").doc(listId);
        const listSnap = await listRef.get();
        if (listSnap.exists) {
          const listEmails = (listSnap.data() as ListData).emails || [];
          allEmails = [...allEmails, ...listEmails];
        }
      }
      const uniqueEmails = [...new Set(allEmails)];

      if (uniqueEmails.length === 0) {
        await jobRef.update({
          status: "completed",
          finishedAt: admin.firestore.FieldValue.serverTimestamp(),
          sentCount: 0,
          error: "No emails to send.",
        });
        logger.warn(`[${jobId}] No unique emails found to send.`);
        return;
      }

      // 4. Configure Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: smtpConfig.smtpHost,
        port: smtpConfig.smtpPort,
        secure: smtpConfig.smtpSecure ?? true,
        auth: {
          user: smtpConfig.smtpUser,
          pass: smtpConfig.smtpPass,
        },
      });

      // 5. Send emails
      const fromName = smtpConfig.fromName || "Gestor Elite";
      const fromEmail = smtpConfig.fromEmail || smtpConfig.smtpUser;
      const fromAddress = `"${fromName}" <${fromEmail}>`;
      let sentCount = 0;
      const errors: string[] = [];

      // Batch write recipient status
      const batch = db.batch();

      for (const email of uniqueEmails) {
        const recipientDocRef = recipientsRef.doc(
          email.replace(/[^a-zA-Z0-9]/g, "_")
        );
        try {
          await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: subject,
            html: htmlContent,
          });
          sentCount++;
          batch.set(recipientDocRef, {
            email: email,
            status: "sent",
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (error: any) {
          logger.error(
            `[${jobId}] Failed to send email to ${email}`,
            error,
          );
          errors.push(`Failed for ${email}: ${error.message}`);
          batch.set(recipientDocRef, {
            email: email,
            status: "failed",
            error: error.message,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();

      // 6. Update job status to 'completed'
      await jobRef.update({
        status: "completed",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        sentCount: sentCount,
        errorCount: errors.length,
        errors: errors,
      });
      const emailTotal = uniqueEmails.length;
      logger.info(
        `[${jobId}] Finished. Sent ${sentCount} of ${emailTotal} emails.`,
      );
    } catch (error: any) {
      logger.error(`[${jobId}] A critical error occurred:`, error);
      await jobRef.update({
        status: "failed",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
      });
    }
  });
