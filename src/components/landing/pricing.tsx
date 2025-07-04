import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Basic',
    price: '$29',
    period: '/month',
    description: 'For small teams getting started.',
    features: ['10 Users', 'Service Order Management', 'Basic Reporting', 'Email Support'],
    cta: 'Start Trial',
    isPopular: false,
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/month',
    description: 'For growing businesses that need more power.',
    features: ['50 Users', 'Advanced CRM', 'Customizable Reports', 'Priority Support', 'API Access'],
    cta: 'Select Plan',
    isPopular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with specific needs.',
    features: ['Unlimited Users', 'Dedicated Account Manager', 'On-Premise Option', 'SLA Guarantee'],
    cta: 'Contact Us',
    isPopular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline">
            Simple, Transparent Pricing
          </h2>
          <p className="max-w-[700px] mx-auto text-muted-foreground md:text-lg mt-2 font-body">
            Choose the plan that's right for your business.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {plans.map((plan, index) => (
            <Card key={index} className={`flex flex-col h-full ${plan.isPopular ? 'border-accent shadow-accent/20 shadow-lg' : ''}`}>
              {plan.isPopular && (
                <div className="bg-accent text-accent-foreground text-sm font-bold py-1 text-center rounded-t-lg">
                  Most Popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                <CardDescription className="font-body">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold font-headline">{plan.price}</span>
                  <span className="text-muted-foreground font-body">{plan.period}</span>
                </div>
                <ul className="space-y-4 font-body">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={`w-full ${plan.isPopular ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}`}>
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
