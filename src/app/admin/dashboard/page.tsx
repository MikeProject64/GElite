import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, CreditCard, Puzzle } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Painel do Administrador</h1>
      <Card>
          <CardHeader>
              <CardTitle>Bem-vindo, Administrador!</CardTitle>
              <CardDescription>Esta é a sua área central de gerenciamento. Use o menu à esquerda para navegar pelas funcionalidades.</CardDescription>
          </CardHeader>
          <CardContent>
              <p>Aqui você poderá visualizar estatísticas gerais, gerenciar usuários, planos e integrações.</p>
          </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">Em breve: dados reais</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Em breve: dados reais</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Integrações</CardTitle>
              <Puzzle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
               <p className="text-xs text-muted-foreground">Em breve: dados reais</p>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
