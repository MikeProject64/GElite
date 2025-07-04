'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AcompanhamentoPage() {
    return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">
                    Acompanhamento
                </h3>
                <p className="text-sm text-muted-foreground">
                   Página em construção. Em breve, gráficos e relatórios de desempenho.
                </p>
            </div>
        </div>
    )
}
