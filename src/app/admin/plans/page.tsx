import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function AdminPlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Planos</h1>
        <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4"/> Novo Plano
        </Button>
      </div>
      <Card>
          <CardHeader>
              <CardTitle>Planos de Assinatura</CardTitle>
              <CardDescription>Crie e edite os planos de assinatura disponíveis para os usuários.</CardDescription>
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
