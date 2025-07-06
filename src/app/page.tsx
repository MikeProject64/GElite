import { Hero } from '@/components/landing/hero';
import { KeyFeatures } from '@/components/landing/key-features';
import { Features } from '@/components/landing/features';
import { Benefits } from '@/components/landing/benefits';
import { Pricing } from '@/components/landing/pricing';
import { Guarantee } from '@/components/landing/guarantee';
import { Gallery } from '@/components/landing/gallery';
import { Footer } from '@/components/landing/footer';
import { Header } from '@/components/header';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserSettings } from '@/types';
import { TargetAudience } from '@/components/landing/target-audience';
import { Testimonials } from '@/components/landing/testimonials';
import { Comparison } from '@/components/landing/comparison';

// This is now an async server component.
export default async function Home() {
  
  // Fetch settings on the server to prevent image flashing on the client.
  let landingPageImages: UserSettings['landingPageImages'] = {};
  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      landingPageImages = settingsSnap.data().landingPageImages || {};
    }
  } catch (error) {
    console.error("Failed to fetch landing page settings on server:", error);
    // Continue with default images if fetch fails
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Header />
      <main className="flex-grow">
        <Hero landingPageImages={landingPageImages} />
        <KeyFeatures />
        <TargetAudience />
        <Features landingPageImages={landingPageImages} />
        <Benefits />
        <Testimonials landingPageImages={landingPageImages} />
        <Comparison />
        <Pricing />
        <Guarantee />
        <Gallery landingPageImages={landingPageImages} />
      </main>
      <Footer />
    </div>
  );
}
