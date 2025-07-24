'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function ServicosEstatisticasPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    Estatísticas de Serviços
                </CardTitle>
                <CardDescription>
                    Visualize gráficos e métricas sobre suas ordens de serviço.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-10">
                    <h3 className="text-lg font-semibold">Em breve</h3>
                    <p className="text-sm text-muted-foreground">
                        Esta seção está em desenvolvimento e estará disponível em breve.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
} 