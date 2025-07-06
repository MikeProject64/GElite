'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';
import { Hero } from '@/components/landing/hero';
import { KeyFeatures } from '@/components/landing/key-features';
import { Features } from '@/components/landing/features';
import { Benefits } from '@/components/landing/benefits';
import { Pricing } from '@/components/landing/pricing';
import { Guarantee } from '@/components/landing/guarantee';
import { Footer } from '@/components/landing/footer';
import { Header } from '@/components/header';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        <Hero />
        <KeyFeatures />
        <Features />
        <Benefits />
        <Pricing />
        <Guarantee />
      </main>
      <Footer />
    </div>
  );
}
