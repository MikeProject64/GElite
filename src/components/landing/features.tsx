import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Users, Wrench } from 'lucide-react';

const features = [
  {
    icon: <Wrench className="w-8 h-8 text-accent" />,
    title: 'Service Order Creation',
    description: 'Quickly create and assign detailed service orders. Track every job from initiation to completion with customizable fields and templates.',
  },
  {
    icon: <ClipboardList className="w-8 h-8 text-accent" />,
    title: 'Comprehensive Management',
    description: 'Manage your technicians, schedules, and inventory from a single, intuitive dashboard. Optimize routes and resources effortlessly.',
  },
  {
    icon: <Users className="w-8 h-8 text-accent" />,
    title: 'Integrated CRM',
    description: 'Build lasting customer relationships with a built-in CRM. Access complete customer history, preferences, and communication logs instantly.',
  },
];

export function Features() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            How ServiceWise Works
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Our platform simplifies every step of your service workflow.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="flex flex-col items-center text-center p-6 transition-transform transform hover:-translate-y-2">
              <CardHeader className="flex items-center justify-center">
                <div className="p-4 bg-accent/10 rounded-full">
                  {feature.icon}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <CardTitle className="font-headline">{feature.title}</CardTitle>
                <p className="text-muted-foreground font-body">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
