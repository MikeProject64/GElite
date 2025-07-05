
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Hourglass, Activity, Loader2 } from "lucide-react";
import Link from 'next/link';

interface QuickActionsProps {
  stats: {
    overdueOrders: number;
    pendingQuotes: number;
  };
  loading: boolean;
}

export function QuickActions({ stats, loading }: QuickActionsProps) {
  const actions = [
    {
      title: "Serviços Vencidos",
      count: stats.overdueOrders,
      icon: <AlertTriangle className="h-6 w-6 text-destructive" />,
      href: "/dashboard/prazos?filter=overdue",
      color: "text-destructive",
      description: "Serviços que passaram do prazo.",
    },
    {
      title: "Orçamentos Pendentes",
      count: stats.pendingQuotes,
      icon: <Hourglass className="h-6 w-6 text-blue-500" />,
      href: "/dashboard/orcamentos?status=Pendente",
      color: "text-blue-500",
      description: "Aguardando aprovação do cliente.",
    },
  ];

  return (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity /> Ações Rápidas</CardTitle>
            <CardDescription>Atalhos para as tarefas mais urgentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {loading ? (
                 <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                actions.map((action) => (
                    action.count > 0 && (
                        <Link href={action.href} key={action.title} className="block p-3 rounded-lg hover:bg-secondary transition-colors">
                            <div className="flex items-center gap-4">
                                {action.icon}
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{action.title}</p>
                                        <p className={`text-xl font-bold ${action.color}`}>{action.count}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{action.description}</p>
                                </div>
                            </div>
                        </Link>
                    )
                ))
            )}
            {!loading && actions.every(a => a.count === 0) && (
                 <p className="text-sm text-center text-muted-foreground py-8">Nenhuma ação urgente no momento. Bom trabalho!</p>
            )}
        </CardContent>
    </Card>
  );
}
