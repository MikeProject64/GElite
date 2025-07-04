import type { Metadata } from 'next';
import { Poppins, PT_Sans } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { SettingsProvider } from '@/components/settings-provider';
import DynamicLayoutEffects from '@/components/dynamic-layout-effects';
import { cn } from '@/lib/utils';

const fontSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

const fontHeading = Poppins({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'ServiceWise',
  description: 'Otimize sua gestão de serviços com o ServiceWise.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head />
      <body className={cn(
        "font-body antialiased",
        fontSans.variable,
        fontHeading.variable
      )}>
        <AuthProvider>
          <SettingsProvider>
            <DynamicLayoutEffects />
            {children}
            <Toaster />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
