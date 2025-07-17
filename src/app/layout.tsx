
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';
import { GA_TRACKING_ID } from '@/lib/utils';
import MetaPixel from '@/components/meta-pixel';
import { Suspense } from 'react';
import { CookieBanner } from '@/components/cookie-banner';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
      if (data.landingPageImages?.heroImage) {
        imageUrl = data.landingPageImages.heroImage;
      }
    }
  } catch (error) {
    // Loga o erro, mas não impede a build, usando os valores de fallback
    console.error("Failed to fetch settings for metadata:", error);
  }

  return {
    metadataBase: new URL('https://gestorelite.app'), // Define a URL base para todas as URLs relativas
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    openGraph: {
      title: siteName,
      description: siteDescription,
      url: '/', // URL canônica da página
      siteName: siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `Apresentação do ${siteName}`,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: siteName,
        description: siteDescription,
        images: [imageUrl],
    },
    icons: {
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path fill=%22%233380CC%22 d=%22M77.9,14.7c-3.6-3.6-8.5-4.7-12.9-3.2l-8.6,3c-1.3,0.4-2.8,1.3-4,2.3c-4.4,4.1-4.8,11.2-1,16.2l-8.8,8.8 c-8.5-5.5-20.2-3.8-26.9,2.9c-8.1,8.1-8.1,21.2,0,29.3c8.1,8.1,21.2,8.1,29.3,0c6.7-6.7,8.4-18.4,2.9-26.9l8.8-8.8 c5,3.8,12.1,3.4,16.2-1c1.1-1.2,1.9-2.7,2.3-4l3-8.6C82.6,23.2,81.5,18.3,77.9,14.7z%22></path><path fill=%22%23F0F4F7%22 d=%22M58.3,41.7c-2.3-2.3-2.3-6.1,0-8.5s6.1-2.3,8.5,0s2.3,6.1,0,8.5S60.6,44,58.3,41.7z%22></path></svg>',
      shortcut: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path fill=%22%233380CC%22 d=%22M77.9,14.7c-3.6-3.6-8.5-4.7-12.9-3.2l-8.6,3c-1.3,0.4-2.8,1.3-4,2.3c-4.4,4.1-4.8,11.2-1,16.2l-8.8,8.8 c-8.5-5.5-20.2-3.8-26.9,2.9c-8.1,8.1-8.1,21.2,0,29.3c8.1,8.1,21.2,8.1,29.3,0c6.7-6.7,8.4-18.4,2.9-26.9l8.8-8.8 c5,3.8,12.1,3.4,16.2-1c1.1-1.2,1.9-2.7,2.3-4l3-8.6C82.6,23.2,81.5,18.3,77.9,14.7z%22></path><path fill=%22%23F0F4F7%22 d=%22M58.3,41.7c-2.3-2.3-2.3-6.1,0-8.5s6.1-2.3,8.5,0s2.3,6.1,0,8.5S60.6,44,58.3,41.7z%22></path></svg>',
      apple: '/apple-touch-icon.png',
    },
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
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
