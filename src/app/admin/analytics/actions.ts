
'use server';

import { BetaAnalyticsDataClient } from '@google-analytics/data';

const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID;

interface AnalyticsData {
  activeUsers: number;
  pageViews: number;
  newUsers: number;
  conversions: number;
}

export async function getAnalyticsReport(): Promise<{ success: boolean; data?: AnalyticsData; message?: string }> {
  if (!GA4_PROPERTY_ID) {
    return {
      success: false,
      message: 'O ID da Propriedade do Google Analytics 4 (GA4_PROPERTY_ID) não está configurado no seu ambiente.',
    };
  }

  const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasDirectCredentials = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_PRIVATE_KEY;

  if (!hasCredentialsFile && !hasDirectCredentials) {
    return {
      success: false,
      message: 'As credenciais do Google Cloud não foram encontradas. Configure as variáveis de ambiente necessárias (ex: GOOGLE_APPLICATION_CREDENTIALS ou GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY).',
    };
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient();

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
    if (error.message.includes('permission denied') || error.code === 7) {
      return { success: false, message: 'Erro de permissão. Verifique se a conta de serviço tem a função de "Leitor" na sua propriedade do Google Analytics e se a API está ativada.' };
    }
    return { success: false, message: `Falha ao buscar dados do Google Analytics: ${error.message}` };
  }
}
