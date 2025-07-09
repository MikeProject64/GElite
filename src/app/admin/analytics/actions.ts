
'use server';

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AnalyticsData {
  activeUsers: number;
  pageViews: number;
  newUsers: number;
  conversions: number;
}

export async function getAnalyticsReport(): Promise<{ success: boolean; data?: AnalyticsData; message?: string }> {
  const settingsRef = doc(db, 'siteConfig', 'main');
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    return { success: false, message: 'Configurações do site não encontradas. Configure as integrações na página de administrador.' };
  }
  const settingsData = settingsSnap.data();
  const GA4_PROPERTY_ID = settingsData.ga4PropertyId;
  const GA4_CREDENTIALS_JSON = settingsData.ga4CredentialsJson;


  if (!GA4_PROPERTY_ID) {
    return {
      success: false,
      message: 'O ID da Propriedade do Google Analytics 4 não está configurado. Por favor, adicione-o na página de Integrações.',
    };
  }

  if (!GA4_CREDENTIALS_JSON) {
      return {
          success: false,
          message: 'As credenciais do Google Cloud (arquivo JSON) não foram configuradas. Por favor, faça o upload na página de Integrações.'
      }
  }

  try {
    const credentials = JSON.parse(GA4_CREDENTIALS_JSON);

    const analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key.replace(/\\n/g, '\n'),
        }
    });

    const [reportResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'newUsers' },
        { name: 'conversions' },
      ],
    });

    const getMetricValue = (metricName: string) => {
        const metricHeaderIndex = reportResponse.metricHeaders?.findIndex(header => header.name === metricName);
        if (metricHeaderIndex === undefined || metricHeaderIndex === -1) return '0';
        return reportResponse.rows?.[0]?.metricValues?.[metricHeaderIndex]?.value ?? '0';
    };

    const activeUsers = getMetricValue('activeUsers');
    const pageViews = getMetricValue('screenPageViews');
    const newUsers = getMetricValue('newUsers');
    const conversions = getMetricValue('conversions');

    return {
      success: true,
      data: {
        activeUsers: parseInt(activeUsers, 10),
        pageViews: parseInt(pageViews, 10),
        newUsers: parseInt(newUsers, 10),
        conversions: parseInt(conversions, 10),
      },
    };

  } catch (error: any) {
    console.error('Google Analytics API Error:', error);
    if (error.message.includes('permission denied') || error.code === 7 || error.message.includes('invalid_grant')) {
      return { success: false, message: 'Erro de permissão. Verifique se as credenciais JSON são válidas, se a conta de serviço tem a função de "Leitor" na sua propriedade do Google Analytics e se a API Google Analytics Data está ativada.' };
    }
     if (error instanceof SyntaxError) {
      return { success: false, message: 'O arquivo de credenciais JSON parece ser inválido. Por favor, faça o upload de um arquivo válido.' };
    }
    return { success: false, message: `Falha ao buscar dados do Google Analytics: ${error.message}` };
  }
}
