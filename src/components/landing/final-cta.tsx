import { Button } from '@/components/ui/button';

export function FinalCta() {
  return (
    <section id="final-cta" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary">
            Ready to Transform Your Service Operations?
          </h2>
          <p className="max-w-[600px] text-muted-foreground md:text-xl font-body">
            Join hundreds of businesses growing with ServiceWise. Get started today with a risk-free trial.
          </p>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            Start Your Free Trial
          </Button>
        </div>
      </div>
    </section>
  );
}
