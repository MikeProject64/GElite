import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export function ProblemSolution() {
  return (
    <section id="problem-solution" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Tired of Inefficient Service Management?
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Disconnected tools and manual processes lead to wasted time, frustrated customers, and lost revenue.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <Card className="bg-destructive/10 border-destructive/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <CardTitle className="font-headline text-destructive">The Problem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-body text-destructive/80">
                <p>Scattered customer data leads to impersonal service.</p>
                <p>Manual scheduling causes delays and double bookings.</p>
                <p>Lack of real-time visibility hinders decision-making.</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/10 border-primary/30">
              <CardHeader className="flex flex-row items-center gap-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <CardTitle className="font-headline text-primary">The ServiceWise Solution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-body text-primary/80">
                <p>Centralized CRM for a 360-degree customer view.</p>
                <p>Automated dispatch and smart scheduling.</p>
                <p>Powerful analytics dashboards for data-driven insights.</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-center">
            <Image
              src="https://placehold.co/500x500.png"
              alt="Problem Solution Diagram"
              width={500}
              height={500}
              className="rounded-xl shadow-lg"
              data-ai-hint="workflow diagram"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
