import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Smile, ShieldCheck, DollarSign } from 'lucide-react';

const benefits = [
  {
    icon: <TrendingUp className="w-8 h-8 text-primary" />,
    title: 'Boost Productivity',
    description: 'Automate repetitive tasks and optimize workflows to get more done with fewer resources.',
  },
  {
    icon: <Smile className="w-8 h-8 text-primary" />,
    title: 'Enhance Customer Satisfaction',
    description: 'Deliver faster, more reliable service and keep clients informed every step of the way.',
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: 'Smarter Decision-Making',
    description: 'Leverage real-time data and analytics to identify trends and make informed business decisions.',
  },
  {
    icon: <DollarSign className="w-8 h-8 text-primary" />,
    title: 'Reduce Operational Costs',
    description: 'Minimize waste, optimize resource allocation, and reduce overheads with efficient management.',
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="w-full py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Unlock Your Business Potential
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            ServiceWise is more than a tool—it's a growth partner.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex flex-col items-center text-center p-4">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-bold font-headline mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground font-body">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
