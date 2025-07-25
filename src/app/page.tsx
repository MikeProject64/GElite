
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
import { FreeTrial } from '@/components/landing/free-trial';
import { Faq } from '@/components/landing/faq';
import { FinalCta } from '@/components/landing/final-cta';
import { AdminPanelButton } from '@/components/admin-panel-button';
import { ScrollDownArrow } from '@/components/landing/scroll-down-arrow';

// This is now an async server component.
export default async function Home() {
  
  // Fetch settings on the server to prevent image flashing on the client.
  let siteName = 'Gestor Elite';
  let iconName = 'Wrench';
  let landingPageImages: UserSettings['landingPageImages'] = {};

  try {
    const settingsRef = doc(db, 'siteConfig', 'main');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      const data = settingsSnap.data();
      siteName = data.siteName || 'Gestor Elite';
      iconName = data.iconName || 'Wrench';
      landingPageImages = data.landingPageImages || {};
    }
  } catch (error) {
    console.error("Failed to fetch landing page settings on server:", error);
    // Continue with default images if fetch fails
  }

  return (
    <div className="dark flex flex-col min-h-screen bg-background text-foreground font-sans">
      <Header siteName={siteName} iconName={iconName} />
      <main className="flex-grow">
        <Hero landingPageImages={landingPageImages} />
        <ScrollDownArrow targetId="key-features" />
        <KeyFeatures />
        <TargetAudience />
        <Features landingPageImages={landingPageImages} />
        <Benefits />
        <Testimonials landingPageImages={landingPageImages} />
        <Comparison />
        <FreeTrial />
        <Pricing />
        <Guarantee />
        <Gallery landingPageImages={landingPageImages} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <AdminPanelButton />
    </div>
  );
}
