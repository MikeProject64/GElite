
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Hourglass, Activity, Loader2, PlusCircle, FilePlus, UserPlus } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface QuickActionsProps {
  stats: {
    overdueOrders: number;
    pendingQuotes: number;
  };
  loading: boolean;
}

export function QuickActions({ stats, loading }: QuickActionsProps) {
  const alertActions = [
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

  const creationActions = [
      {
          title: "Nova O.S.",
          icon: <PlusCircle className="mr-2 h-4 w-4" />,
          href: "/dashboard/servicos/criar",
          variant: "default"
      },
      {
          title: "Novo Orçamento",
          icon: <FilePlus className="mr-2 h-4 w-4" />,
          href: "/dashboard/orcamentos/criar",
          variant: "secondary"
      },
      {
          title: "Novo Cliente",
          icon: <UserPlus className="mr-2 h-4 w-4" />,
          href: "/dashboard/base-de-clientes",
          variant: "secondary"
      }
  ];

  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity /> Ações Rápidas</CardTitle>
            <CardDescription>Atalhos para as tarefas mais importantes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow">
            <div className='flex-grow'>
              {loading ? (
                  <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : (
                  <div className="space-y-4">
                      {alertActions.map((action) => (
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
                      ))}
                      {!alertActions.some(a => a.count > 0) && (
                          <p className="text-sm text-center text-muted-foreground py-4">Nenhuma ação urgente no momento. Bom trabalho!</p>
                      )}
                  </div>
              )}
            </div>
            
            <div className="mt-auto pt-4">
                <Separator className="mb-4" />
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {creationActions.map(action => (
                        <Button key={action.title} asChild variant={action.variant as any} size="sm">
                            <Link href={action.href}>
                                {action.icon}
                                {action.title}
                            </Link>
                        </Button>
                    ))}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
