'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const tabs = [
    { path: '/dashboard/servicos', label: 'Lista de serviços' },
    { path: '/dashboard/servicos/modelos', label: 'Modelos' },
    { path: '/dashboard/servicos/personalizar', label: 'Personalizar' },
    { path: '/dashboard/servicos/estatisticas', label: 'Estatísticas' },
];

export default function ServicosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const currentTab = tabs.find(tab => pathname === tab.path)?.path || '/dashboard/servicos';

    return (
        <div className="flex flex-col gap-4 w-full">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Serviços</h1>
                    <p className="text-sm text-muted-foreground">
                        Visualize e gerencie todas as ordens de serviço em um único lugar.
                    </p>
                </div>
                <Button size="sm" className="h-8 gap-1" asChild>
                    <Link href="/dashboard/servicos/criar">
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Ordem de Serviço</span>
                    </Link>
                </Button>
            </div>

            <Tabs value={currentTab} onValueChange={(value) => router.push(value)}>
                <TabsList>
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.path} value={tab.path} asChild>
                            <Link href={tab.path}>{tab.label}</Link>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="mt-4">
                {children}
            </div>
        </div>
    );
} 