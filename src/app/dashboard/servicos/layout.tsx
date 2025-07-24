'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateServiceOrderModal } from '@/components/create-service-order-modal';
import { usePermissions } from '@/hooks/use-permissions';
import { ProtectedComponent } from '@/components/security/protected-component';
import { useAuth, AppFunction } from '@/components/auth-provider';

// A configuração agora define apenas os metadados da UI, não as permissões.
const TABS_DATA = [
    { path: '/dashboard/servicos', label: 'Lista de serviços' },
    { path: '/dashboard/servicos/modelos', label: 'Modelos' },
    { path: '/dashboard/servicos/personalizar', label: 'Personalizar' },
    { path: '/dashboard/servicos/estatisticas', label: 'Estatísticas' },
];

// O "href" para a ação de criar, como definido no catálogo de funções do admin.
const CREATE_ACTION_HREF = '/actions/servicos/criar';

export default function ServicosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { availableFunctions } = useAuth();

    // Encontra o ID da função de criação pelo seu href.
    const createFuncId = availableFunctions.find(f => f.href === CREATE_ACTION_HREF)?.id || '';

    // Filtra as abas que existem no catálogo de funções E para as quais o usuário tem permissão.
    const visibleTabs = TABS_DATA.map(tab => {
        const func = availableFunctions.find(f => f.href === tab.path);
        return func ? { ...tab, functionId: func.id } : null;
    }).filter((tab): tab is { path: string; label: string; functionId: string; } => tab !== null);

    const currentTab = visibleTabs.find(tab => pathname === tab.path)?.path || (visibleTabs.length > 0 ? visibleTabs[0].path : '/dashboard');

    return (
        <>
            <div className="flex flex-col gap-4 w-full">
                <div className="flex justify-center items-center gap-4">
                    <Tabs value={currentTab} onValueChange={(value) => router.push(value)}>
                        <TabsList>
                            {visibleTabs.map((tab) => (
                                <ProtectedComponent key={tab.path} functionId={tab.functionId}>
                                    <TabsTrigger value={tab.path} asChild>
                                        <Link href={tab.path}>{tab.label}</Link>
                                    </TabsTrigger>
                                </ProtectedComponent>
                            ))}
                        </TabsList>
                    </Tabs>
                    <ProtectedComponent functionId={createFuncId}>
                        <Button size="sm" className="h-8 gap-1" onClick={() => setIsCreateModalOpen(true)}>
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Ordem de Serviço</span>
                        </Button>
                    </ProtectedComponent>
                </div>

                <div className="mt-4">
                    {children}
                </div>
            </div>
            <CreateServiceOrderModal isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </>
    );
} 