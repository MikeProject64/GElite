'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart2 } from "lucide-react";

export default function InventarioEstatisticasPage() {
    return (
        <div className="flex flex-col gap-4">
            <Card className="flex flex-col items-center justify-center text-center p-10">
                <CardHeader>
                    <div className="mx-auto bg-muted rounded-full p-4 w-fit">
                        <BarChart2 className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">Página em Construção</CardTitle>
                    <CardDescription className="mt-2 max-w-md mx-auto">
                        Estamos trabalhando para trazer as estatísticas de inventário para você. Em breve, você poderá visualizar dados sobre entradas, saídas e valor de estoque.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
} 