
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

export async function generateMetadata(): Promise<Metadata> {
  // Fetch settings for dynamic metadata
  let siteName = 'Gestor Elite';
  let siteDescription = 'Otimize sua gestão de serviços com a plataforma completa para prestadores de serviço.';
  let imageUrl = 'https://gestorelite.app/og-image.png'; // Fallback image

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
      url: 'https://gestorelite.app',
      siteName: siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
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
      icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>‍</text></svg>",
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
