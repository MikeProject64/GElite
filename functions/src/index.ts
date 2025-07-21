/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onCall, HttpsError, CallableOptions} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import {randomBytes} from "crypto";

// Interfaces para os dados
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

// Inicialização do Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Coloque a URL do seu app em produção aqui.
const PROD_APP_URL = "https://servicewise-l8b2a.web.app";
const DEV_APP_URL = "http://localhost:9002";

const CORS_OPTIONS: CallableOptions = {
  cors: ["http://localhost:3000", "https://gelite.vercel.app"], // Adicione todos os seus domínios
  enforceAppCheck: false, // Defina como true em produção
  maxInstances: 10,
};

/**
 * Checks if an email already exists in the users collection.
 * This is a callable function to be invoked from the client-side.
 */
export const checkEmailExistsCallable = onCall(
  CORS_OPTIONS,
  async (request) => {
    const email = request.data.email;
    if (!email || typeof email !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "O e-mail não foi fornecido ou é inválido."
      );
    }

    try {
      const usersRef = db.collection("users");
      const snapshot = await usersRef.where("email", "==", email).get();

      if (snapshot.empty) {
        return {exists: false};
      }

      return {exists: true};
    } catch (error) {
      logger.error("Erro ao verificar a existência do e-mail:", error);
      throw new HttpsError(
        "internal",
        "Ocorreu um erro ao verificar o e-mail."
      );
    }
  }
);


/**
 * Initiates the unified flow for email verification and password setup.
 * Generates a secure token and queues a transactional email.
 */
export const iniciarFluxoUnificado = onCall(CORS_OPTIONS, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado para realizar esta ação."
    );
  }

  const userId = request.auth.uid;
  const userRecord = await admin.auth().getUser(userId);
  const userEmail = userRecord.email;

  if (!userEmail) {
    throw new HttpsError(
      "failed-precondition",
      "O usuário não possui um e-mail para verificação."
    );
  }

  // 1. Generate a secure, URL-safe token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // 2. Save the token to Firestore
  const tokenRef = db.collection("tokensDeAcao").doc(token);
  await tokenRef.set({
    userId: userId,
    type: "VERIFICACAO_E_SENHA",
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    used: false,
  });

  // 3. Queue the email
  // IMPORTANT: Ensure you have a 'verificacao-e-senha' template in Firestore
  const appUrl = process.env.FUNCTIONS_EMULATOR ? DEV_APP_URL : PROD_APP_URL;
  const actionUrl = `${appUrl}/auth/definir-senha?token=${token}`;
  const emailQueueRef = db.collection("emailQueue").doc();
  await emailQueueRef.set({
    to: userEmail,
    templateId: "verificacao-e-senha",
    templateData: {
      ACTION_URL: actionUrl,
      USER_NAME: userRecord.displayName || "Usuário",
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(
    `Fluxo unificado iniciado para o usuário ${userId}. E-mail para ${userEmail} enfileirado.`
  );
  return {success: true, message: "E-mail de verificação enviado."};
});


/**
 * Executes the unified action: verifies email and sets the new password.
 */
export const executarAcaoUnificada = onCall(CORS_OPTIONS, async (request) => {
  const {token, novaSenha} = request.data;

  if (!token || !novaSenha) {
    throw new HttpsError(
      "invalid-argument",
      "Token e nova senha são obrigatórios."
    );
  }

  if (novaSenha.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "A senha deve ter pelo menos 6 caracteres."
    );
  }

  const tokenRef = db.collection("tokensDeAcao").doc(token);
  const tokenDoc = await tokenRef.get();

  if (!tokenDoc.exists) {
    throw new HttpsError("not-found", "Token inválido ou não encontrado.");
  }

  const tokenData = tokenDoc.data();

  if (
    !tokenData ||
    tokenData.used ||
    tokenData.expiresAt.toDate() < new Date()
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Token expirado ou já utilizado."
    );
  }

  const userId = tokenData.userId;

  try {
    // Update user in Firebase Auth
    await admin.auth().updateUser(userId, {
      emailVerified: true,
      password: novaSenha,
    });

    // Mark token as used
    await tokenRef.update({used: true});

    logger.info(`Ação unificada executada com sucesso para o usuário ${userId}.`);
    return {success: true, message: "E-mail verificado e senha definida!"};
  } catch (error) {
    logger.error(`Erro ao executar ação unificada para ${userId}:`, error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro ao atualizar sua conta."
    );
  }
});


/**
 * Processes the email queue for both marketing campaigns and transactional emails.
 */
export const processEmailQueue = onDocumentCreated("emailQueue/{jobId}",
  async (event) => {
    const jobData = event.data?.data();
    const jobId = event.params.jobId;

    if (!jobData) {
      logger.error(`[${jobId}] No data associated with the event.`);
      return;
    }

    logger.info(
      `[${jobId}] Starting email queue processing...`, {jobData}
    );

    const {templateId, listIds, to, templateData = {}} = jobData;

    // Mark job as 'processing'
    const jobRef = db.collection("emailQueue").doc(jobId);
    await jobRef.update({
      status: "processing",
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      // 1. Fetch SMTP configuration
      const configRef = db.collection("integrations").doc("email");
      const configSnap = await configRef.get();
      const smtpConfig: SmtpConfig = configSnap.data() || {};

      if (!smtpConfig.smtpHost || !smtpConfig.smtpPort ||
          !smtpConfig.smtpUser || !smtpConfig.smtpPass) {
        throw new Error("SMTP configuration is incomplete.");
      }

      // 2. Fetch email template
      const templateRef = db.collection("emailTemplates").doc(templateId);
      const templateSnap = await templateRef.get();
      if (!templateSnap.exists) {
        throw new Error(`Email template with ID ${templateId} not found.`);
      }
      const {subject, htmlContent: rawHtmlContent} =
        templateSnap.data() as TemplateData;

      // 3. Determine recipients
      let uniqueEmails: string[] = [];
      if (to) { // Transactional email
        uniqueEmails = [to];
      } else if (listIds && listIds.length > 0) { // Campaign email
        const allEmails: string[] = [];
        for (const listId of listIds) {
          const listRef = db.collection("emailLists").doc(listId);
          const listSnap = await listRef.get();
          if (listSnap.exists) {
            allEmails.push(...(listSnap.data() as ListData).emails || []);
          }
        }
        uniqueEmails = [...new Set(allEmails)];
      }

      if (uniqueEmails.length === 0) {
        throw new Error("No recipients found for this job.");
      }

      // 4. Configure Nodemailer
      const transporter = nodemailer.createTransport({
        host: smtpConfig.smtpHost,
        port: smtpConfig.smtpPort,
        secure: smtpConfig.smtpSecure ?? true,
        auth: {user: smtpConfig.smtpUser, pass: smtpConfig.smtpPass},
      });

      // 5. Send emails
      const fromAddress = `"${smtpConfig.fromName || "Gestor Elite"}" <${
        smtpConfig.fromEmail || smtpConfig.smtpUser
      }>`;
      let sentCount = 0;
      const errors: {email: string; error: string}[] = [];

      for (const email of uniqueEmails) {
        // Replace variables in template
        const html = Object.entries(templateData)
          .reduce((acc, [key, value]) => {
            const regex = new RegExp(`{{${key}}}`, "g");
            return acc.replace(regex, String(value));
          }, rawHtmlContent);

        try {
          await transporter.sendMail({from: fromAddress, to: email, subject, html});
          sentCount++;
          // Log individual success if needed
        } catch (err: unknown) {
          const error = err as Error;
          logger.error(`[${jobId}] Failed to send to ${email}`, error);
          errors.push({email, error: error.message});
        }
      }

      // 6. Update job status
      await jobRef.update({
        status: "completed",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        sentCount: sentCount,
        errorCount: errors.length,
        errors: errors,
      });

      logger.info(
        `[${jobId}] Finished. Sent ${sentCount} of ` +
        `${uniqueEmails.length} emails.`
      );
    } catch (err: unknown) {
      const error = err as Error;
      logger.error(`[${jobId}] A critical error occurred:`, error);
      await jobRef.update({
        status: "failed",
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
      });
    }
  });
