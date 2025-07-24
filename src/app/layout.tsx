
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


const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

// generateMetadata busca as configurações do site e cria as metatags para SEO e compartilhamento.
export async function generateMetadata(): Promise<Metadata> {
  // Valores padrão como fallback
  let siteName = 'Gestor Elite';
  let siteDescription = 'Otimize sua gestão de serviços com a plataforma completa para prestadores de serviço.';
  let imageUrl = 'https://gestorelite.app/og-image.png'; // Uma imagem de fallback genérica

  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        siteName = data.siteName || siteName;
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

async function getDynamicFavicon() {
  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      const iconName = data.iconName as keyof typeof availableIcons || 'Rocket';
      const color = data.primaryColorHsl || { h: 210, s: 70, l: 40 };
      const IconComponent = availableIcons[iconName] || availableIcons.Rocket;

      const colorString = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
      // Manually construct the SVG string to avoid importing react-dom/server
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${colorString}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">${IconComponent({}).props.children}</svg>`;

      const faviconUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`;
      
      return <link rel="icon" href={faviconUrl} sizes="any" />;
    }
  } catch (error) {
    console.error("Failed to generate dynamic favicon:", error);
  }
  // Fallback para um favicon padrão se a busca falhar
  return <link rel="icon" href="/favicon.ico" sizes="any" />;
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const favicon = await getDynamicFavicon();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {favicon}
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
