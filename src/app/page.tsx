import { Hero } from '@/components/landing/hero';
import { ProblemSolution } from '@/components/landing/problem-solution';
import { Features } from '@/components/landing/features';
import { Benefits } from '@/components/landing/benefits';
import { Pricing } from '@/components/landing/pricing';
import { FaqGenerator } from '@/components/landing/faq-generator';
import { FinalCta } from '@/components/landing/final-cta';
import { Footer } from '@/components/landing/footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Hero />
        <ProblemSolution />
        <Features />
        <Benefits />
        <Pricing />
        <FaqGenerator />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
