
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';
import { GA_TRACKING_ID } from '@/lib/utils';
import MetaPixel from '@/components/meta-pixel';
import { Suspense } from 'react';
import { CookieBanner } from '@/components/cookie-banner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import React from 'react';


const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

// generateMetadata busca as configurações do site e cria as metatags para SEO e compartilhamento.
export async function generateMetadata(): Promise<Metadata> {
  // Valores padrão como fallback
  const siteName = 'Gestor Elite';
  const siteDescription = 'Otimize sua gestão de serviços com a plataforma completa para prestadores de serviço.';
  let imageUrl = 'https://gestorelite.app/og-image.png'; // Uma imagem de fallback genérica

  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        // Se houver uma imagem de logo ou hero, podemos usá-la para o OpenGraph
        imageUrl = data.logoURL || data.landingPageImages?.heroImage || imageUrl;
    }
  } catch (error) {
    // Loga o erro, mas não impede a build, usando os valores de fallback
    console.error("Failed to fetch settings for metadata:", error);
  }

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    openGraph: {
      title: siteName,
      description: siteDescription,
      images: [imageUrl],
      type: 'website',
      siteName: siteName,
    },
  };
}

async function getDynamicHeadElements() {
  const color = { h: 221.2, s: 83.2, l: 53.3 }; // Azul Padrão

  // SVG estático do foguete azul, conforme solicitado.
  const rocketSvgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="hsl(${color.h}, ${color.s}%, ${color.l}%)" stroke="none">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
    </svg>
  `.trim();
  
  const faviconUrl = `data:image/svg+xml,${encodeURIComponent(rocketSvgString)}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root { --primary-h: ${color.h}; --primary-s: ${color.s}%; --primary-l: ${color.l}%; }` }} />
      <link id="dynamic-favicon" rel="icon" href={faviconUrl} sizes="any" />
    </>
  );
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dynamicHead = await getDynamicHeadElements();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {dynamicHead}
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-N73C2JGT');`}}></script>
        {/* End Google Tag Manager */}

        {/* Google Ads Tag */}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
      )}>
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-N73C2JGT"
        height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
        {/* End Google Tag Manager (noscript) */}
        <Providers>
          {children}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
