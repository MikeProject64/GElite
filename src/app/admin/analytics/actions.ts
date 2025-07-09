
'use server';

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, parse } from 'date-fns';

interface AnalyticsReports {
    success: boolean;
    message?: string;
    data?: {
        realtime: { activeUsers: number };
        mainMetrics: { activeUsers: number; newUsers: number; conversions: number; };
        events: { name: string; count: number; }[];
        pages: { path: string; views: number; }[];
        countries: { name: string; users: number; }[];
        devices: { name: string; users: number; }[];
        conversionFunnel: { newUsers: number; generatedLeads: number; purchasedPlans: number };
        dailyViews: { date: string; views: number; }[];
    };
}


async function getGa4Client() {
  const settingsRef = doc(db, 'siteConfig', 'main');
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    throw new Error('Configurações do site não encontradas. Configure as integrações na página de administrador.');
  }
  const settingsData = settingsSnap.data();
  const GA4_PROPERTY_ID = settingsData.ga4PropertyId;
  const GA4_CREDENTIALS_JSON = settingsData.ga4CredentialsJson;

  if (!GA4_PROPERTY_ID) {
    throw new Error('O ID da Propriedade do Google Analytics 4 não está configurado.');
  }

  if (!GA4_CREDENTIALS_JSON) {
      throw new Error('As credenciais do Google Cloud (arquivo JSON) não foram configuradas.');
  }

  try {
    const credentials = JSON.parse(GA4_CREDENTIALS_JSON);
    const analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key.replace(/\\n/g, '\n'),
        }
    });
    return { client: analyticsDataClient, propertyId: GA4_PROPERTY_ID };
  } catch (error) {
     if (error instanceof SyntaxError) {
      throw new Error('O arquivo de credenciais JSON parece ser inválido.');
    }
    throw error;
  }
}


export async function getAnalyticsReports(): Promise<AnalyticsReports> {
  try {
    const { client, propertyId } = await getGa4Client();
    const propertyPath = `properties/${propertyId}`;

    // 1. Real-time report for active users in the last 30 minutes
    const [realtimeResponse] = await client.runRealtimeReport({
      property: propertyPath,
      metrics: [{ name: 'activeUsers' }],
    });
    const realtimeUsers = parseInt(realtimeResponse.rows?.[0]?.metricValues?.[0]?.value ?? '0', 10);
    
    // 2. Batch report for other metrics (last 30 days for daily, 7 days for others)
    const [batchResponse] = await client.batchRunReports({
      property: propertyPath,
      requests: [
        // Main Metrics (7d)
        {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'conversions' }],
        },
        // Events (7d)
        {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: ['generate_lead', 'plano_contratado', 'begin_checkout'],
              },
            },
          },
        },
        // Pages (7d)
        {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          limit: 5,
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
        },
        // Countries (7d)
        {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 5,
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
        },
        // Devices (7d)
        {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        },
        // Daily Views (30d)
        {
          dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
        },
      ],
    });

    // Helper to process reports
    const getMetric = (report: any, metricName: string, defaultValue = '0') => 
        report?.rows?.[0]?.metricValues?.[report.metricHeaders?.findIndex((h: any) => h.name === metricName)]?.value ?? defaultValue;

    // Process Main Metrics report
    const mainMetricsReport = batchResponse.reports?.[0];
    const mainMetrics = {
        activeUsers: parseInt(getMetric(mainMetricsReport, 'activeUsers'), 10),
        newUsers: parseInt(getMetric(mainMetricsReport, 'newUsers'), 10),
        conversions: parseInt(getMetric(mainMetricsReport, 'conversions'), 10),
    };

    // Process Events report
    const eventsReport = batchResponse.reports?.[1];
    const events = eventsReport?.rows?.map(row => ({
        name: row.dimensionValues?.[0].value ?? 'N/A',
        count: parseInt(row.metricValues?.[0].value ?? '0', 10),
    })) ?? [];

    // Process Pages report
    const pagesReport = batchResponse.reports?.[2];
    const pages = pagesReport?.rows?.map(row => ({
        path: row.dimensionValues?.[0].value ?? 'N/A',
        views: parseInt(row.metricValues?.[0].value ?? '0', 10),
    })) ?? [];

    // Process Countries report
    const countriesReport = batchResponse.reports?.[3];
    const countries = countriesReport?.rows?.map(row => ({
        name: row.dimensionValues?.[0].value ?? 'N/A',
        users: parseInt(row.metricValues?.[0].value ?? '0', 10),
    })) ?? [];

    // Process Devices report
    const devicesReport = batchResponse.reports?.[4];
    const devices = devicesReport?.rows?.map(row => ({
        name: row.dimensionValues?.[0].value ?? 'N/A',
        users: parseInt(row.metricValues?.[0].value ?? '0', 10),
    })) ?? [];

    // Process Daily Views report
    const dailyViewsReport = batchResponse.reports?.[5];
    const dailyViews = dailyViewsReport?.rows?.map(row => {
        // GA4 returns date as '20231225', so we parse it
        const dateStr = row.dimensionValues?.[0].value ?? '19700101';
        const parsedDate = parse(dateStr, 'yyyyMMdd', new Date());
        return {
            date: format(parsedDate, 'dd/MM'),
            views: parseInt(row.metricValues?.[0].value ?? '0', 10),
        };
    }) ?? [];
    
    // Process Conversion Funnel data
    const getEventCount = (eventName: string) => events.find(e => e.name === eventName)?.count ?? 0;
    const conversionFunnel = {
        newUsers: mainMetrics.newUsers,
        generatedLeads: getEventCount('generate_lead'),
        purchasedPlans: getEventCount('plano_contratado'),
    };

    return {
      success: true,
      data: {
        realtime: { activeUsers: realtimeUsers },
        mainMetrics,
        events,
        pages,
        countries,
        devices,
        conversionFunnel,
        dailyViews,
      },
    };

  } catch (error: any) {
    console.error('Google Analytics API Error:', error);
    if (error.message.includes('permission denied') || error.code === 7 || error.message.includes('invalid_grant')) {
      return { success: false, message: 'Erro de permissão. Verifique se as credenciais JSON são válidas, se a conta de serviço tem a função de "Leitor" na sua propriedade do Google Analytics e se a API Google Analytics Data está ativada.' };
    }
    return { success: false, message: `Falha ao buscar dados do Google Analytics: ${error.message}` };
  }
}
