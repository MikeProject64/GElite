
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

// Corrigido para ser uma função simples que retorna JSX estático
async function getDynamicHeadElements() {
  const color = { h: 210, s: 70, l: 40 }; // Cor azul padrão do foguete
  
  // SVG estático do foguete azul, conforme solicitado.
  const rocketSvgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
        <path fill="hsl(${color.h} ${color.s}% ${color.l}%)" d="M117.21 230.91a10.29 10.29 0 0 1-10.2-12.83l33.6-100.83a10.29 10.29 0 1 1 19.55 6.51l-33.6 100.83a10.29 10.29 0 0 1-9.35 6.32Z"/>
        <path fill="hsl(${color.h} ${color.s}% ${color.l}%)" d="M152.89 123a43.16 43.16 0 1 0-86.32 0 43.16 43.16 0 0 0 86.32 0Z"/>
        <path fill="hsl(${color.h} ${color.s}% ${color.l}%)" d="M168.16 230.91a10.29 10.29 0 0 1-10.2-12.83l33.6-100.83a10.29 10.29 0 1 1 19.55 6.51l-33.6 100.83a10.29 10.29 0 0 1-9.35 6.32Z"/>
    </svg>
  `.trim();
  
  const faviconUrl = `data:image/svg+xml,${encodeURIComponent(rocketSvgString)}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root { --primary: ${color.h} ${color.s}% ${color.l}%; }` }} />
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
