"use client";
import { useSettings } from '@/components/settings-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { GraduationCap } from 'lucide-react';
import { tutorials } from '@/lib/tutorials-data';

export default function TutoriaisPage() {
  const { settings } = useSettings();
  const features = settings?.featureFlags ? Object.entries(settings.featureFlags).filter(([_, enabled]) => enabled) : [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-col items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl">Central de Tutoriais</CardTitle>
          <p className="text-muted-foreground text-base mt-2 text-center">Aqui você encontra guias práticos sobre cada funcionalidade disponível no seu plano. Explore os tópicos abaixo para dominar o sistema!</p>
        </CardHeader>
        <CardContent>
          {features.length === 0 && <p className="text-center text-muted-foreground">Você ainda não possui funcionalidades liberadas.</p>}
          {features.length > 0 && (
            <Accordion type="multiple" className="w-full">
              {features.map(([key]) => {
                const tutorial = tutorials[key];
                if (!tutorial) return null;

                return (
                  <AccordionItem value={key} key={key}>
                    <AccordionTrigger className="text-lg">{tutorial.title}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-base text-muted-foreground mb-4">{tutorial.description}</p>
                      <div className="space-y-3">
                        {tutorial.details.map((detail, index) => (
                          <p key={index} className="text-muted-foreground leading-relaxed">
                            {detail.startsWith('**') ? (
                              <>
                                <strong className="text-foreground">{detail.split('**')[1]}</strong>
                                {detail.split('**')[2]}
                              </>
                            ) : (
                              detail
                            )}
                          </p>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 