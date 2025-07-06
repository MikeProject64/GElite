import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function AdminIntegrationsPage() {
  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
      <Card>
          <CardHeader>
              <CardTitle>Integrações Disponíveis</CardTitle>
              <CardDescription>Conecte o ServiceWise com outras ferramentas.</CardDescription>
          </CardHeader>
          <CardContent>
               <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
