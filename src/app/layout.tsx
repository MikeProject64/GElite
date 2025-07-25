
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
import { availableIcons } from '@/components/icon-map';
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
  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      const iconName = (data.iconName || 'Rocket') as keyof typeof availableIcons;
      const IconComponent = availableIcons[iconName] || availableIcons.Rocket;
      const color = data.primaryColorHsl || { h: 211, s: 100, l: 50 };

      // Manually create the SVG string from the icon's children props
      const iconChildren = (IconComponent as any)({}).props.children;
      const paths = React.Children.map(iconChildren, child => {
          if (React.isValidElement(child)) {
              // This is a simplified approach; may need adjustment for complex icons
              return child.props.d ? `<path d="${child.props.d}" />` : '';
          }
          return '';
      }).join('');

      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="hsl(${color.h}, ${color.s}%, ${color.l}%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">${paths}</svg>`;
      const faviconUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`;

      return (
        <>
          <style dangerouslySetInnerHTML={{ __html: `:root { --primary: ${color.h} ${color.s}% ${color.l}%; }` }} />
          <link id="dynamic-favicon" rel="icon" href={faviconUrl} sizes="any" />
        </>
      );
    }
  } catch (error) {
    console.error("Failed to generate dynamic head elements:", error);
  }
  
  // Fallback to a static Rocket icon if fetching fails
  const fallbackSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="hsl(211, 100%, 50%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.3.05-3.05A5.79 5.79 0 0 0 5.58 13a5.79 5.79 0 0 0-1.03 3.5c.01.21.02.42.05.63"/><path d="M12 15.5V18c0 1.1.9 2 2 2h1.5a2 2 0 0 0 2-2v-1.5a2 2 0 0 0-2-2h-1.5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.5a2 2 0 0 1 2 2v1.5a2 2 0 0 1-2 2h-2.87"/><path d="M9 15a6.47 6.47 0 0 1-2 5l-2.7-2.7a8.52 8.52 0 0 1 5-2.3"/><path d="m9.5 4.5-1.04 1.04a5.79 5.79 0 0 0-3.05.05c-.75.75-.79 2.21-.05 3.05s2.3.7 3.05.05A5.79 5.79 0 0 0 9.5 5.58C9.33 5.35 9.17 5.17 9 5a5.79 5.79 0 0 0-.42-1.03C8.37 3.26 7.5 3 6.5 3c0 0-1.26 1.5-2 5s.5 3.74 2 5"/></svg>`;
  const fallbackFaviconUrl = `data:image/svg+xml,${encodeURIComponent(fallbackSvgString)}`;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root { --primary: 211 100% 50%; }` }} />
      <link rel="icon" href={fallbackFaviconUrl} sizes="any" />
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
