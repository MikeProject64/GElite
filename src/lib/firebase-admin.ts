import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { 
  getFirestore as getClientFirestore, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { 
  initializeApp as initializeClientApp, 
  getApps as getClientApps,
  FirebaseApp
} from 'firebase/app';

/**
 * Retorna as credenciais de serviço do Firebase a partir do Firestore.
 * Isso evita armazenar as credenciais diretamente no código-fonte ou em variáveis de ambiente
 * do lado do servidor, centralizando a configuração no banco de dados.
 */
async function getFirebaseCredentials(): Promise<ServiceAccount> {
  // HACK: To get admin credentials from the client-side DB, we need a client-side app.
  // We initialize a separate, temporary "bootstrap" app here to avoid conflicts with the
  // main Next.js client-side Firebase app instance.
  const clientApps: FirebaseApp[] = getClientApps();
  let bootstrapApp = clientApps.find(a => a.name === 'admin-bootstrap');

  if (!bootstrapApp) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    bootstrapApp = initializeClientApp(firebaseConfig, 'admin-bootstrap');
  }
  
  const bootstrapDb = getClientFirestore(bootstrapApp);
  const settingsRef = doc(bootstrapDb, 'siteConfig', 'main');
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

async function initFirebaseAdminApp(): Promise<App> {
  const adminApps = getApps();
  const existingApp = adminApps.find((app) => app.name === ADMIN_APP_NAME);
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
    const app = getApps().find((app) => app.name === ADMIN_APP_NAME);
    if (app) {
        return app;
    }
    // If the error is not the expected "already exists" error, or if the app
    // still doesn't exist for some reason, re-throw the error.
    throw error;
  }
}

let adminApp: App;
let adminAuth: ReturnType<typeof getAuth>;
let dbAdmin: ReturnType<typeof getAdminFirestore>;

/**
 * Returns an initialized Firebase Admin app instance.
 * Ensures that the app is initialized before use.
 */
export async function getFirebaseAdmin() {
  if (!adminApp) {
      adminApp = await initFirebaseAdminApp();
      adminAuth = getAuth(adminApp);
      dbAdmin = getAdminFirestore(adminApp);
  }
  return { adminAuth, dbAdmin, adminApp };
} 