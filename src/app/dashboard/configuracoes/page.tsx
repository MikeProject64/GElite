'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl">Configurações</h1>
      <Card>
        <CardHeader>
          <CardTitle>Página de Configurações</CardTitle>
          <CardDescription>
            Este espaço será utilizado para ajustar as preferências do sistema e gerenciar integrações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg">
            <Settings className="h-12 w-12 mb-4" />
            <p className="font-semibold">Em Desenvolvimento</p>
            <p className="text-sm">Esta funcionalidade estará disponível em breve.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
