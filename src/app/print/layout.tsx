import { ReactNode } from "react";
import '@/app/globals.css';
import { Poppins, PT_Sans } from 'next/font/google';
import { cn } from "@/lib/utils";

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

export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={cn(
        "bg-white font-body",
        fontSans.variable,
        fontHeading.variable
      )}>
        {children}
      </body>
    </html>
  );
}
