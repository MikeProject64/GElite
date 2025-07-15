import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Firestore client-side SDK

/**
 * Retorna as credenciais de serviço do Firebase a partir do Firestore.
 * Isso evita armazenar as credenciais diretamente no código-fonte ou em variáveis de ambiente
 * do lado do servidor, centralizando a configuração no banco de dados.
 */
async function getFirebaseCredentials(): Promise<ServiceAccount> {
  const settingsRef = doc(db, 'siteConfig', 'main');
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    throw new Error('Configurações do site não encontradas para inicializar o Firebase Admin.');
  }
  const settingsData = settingsSnap.data();
  const credentialsJson = settingsData.ga4CredentialsJson; // Reutilizando as credenciais do GA4

  if (!credentialsJson) {
      throw new Error('As credenciais do Firebase (arquivo JSON de serviço) não foram configuradas.');
  }

  try {
    const parsed = JSON.parse(credentialsJson);
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    }
  } catch (error) {
     if (error instanceof SyntaxError) {
      throw new Error('O arquivo de credenciais JSON do Firebase parece ser inválido.');
    }
    throw error;
  }
}

const ADMIN_APP_NAME = 'firebase-admin-app';
const ADMIN_APP_INSTANCE_ERROR = 'The Firebase admin app has already been initialized.';

/**
 * Inicializa o app do Firebase Admin se ainda não tiver sido inicializado.
 * Garante que teremos uma única instância do app rodando no servidor.
 */
export async function initFirebaseAdminApp(): Promise<App> {
  const apps = getApps();
  const existingApp = apps.find((app) => app.name === ADMIN_APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  const credentials = await getFirebaseCredentials();

  try {
    return initializeApp(
      {
        credential: cert(credentials),
      },
      ADMIN_APP_NAME
    );
  } catch (error: any) {
    // This can happen in a race condition where another serverless function
    // initializes the app between our `getApps()` check and this `initializeApp()` call.
    // If that's the case, we can safely ignore the error and return the existing app.
    const apps = getApps();
    const app = apps.find((app) => app.name === ADMIN_APP_NAME);
    if (app) {
        return app;
    }
    // If the error is not the expected "already exists" error, or if the app
    // still doesn't exist for some reason, re-throw the error.
    throw error;
  }
}

// Inicializa e exporta o Firestore Admin para ser usado em outras server actions.
let dbAdmin: ReturnType<typeof getFirestore>;
initFirebaseAdminApp().then(app => {
    dbAdmin = getFirestore(app);
});

export { dbAdmin }; 