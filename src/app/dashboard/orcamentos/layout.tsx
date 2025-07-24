'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { usePermissions } from '@/hooks/use-permissions';
import { ProtectedComponent } from '@/components/security/protected-component';
import { useAuth } from '@/components/auth-provider';
import { CreateQuoteModal } from "@/components/create-quote-modal";

// Configuração do menu para a seção de Orçamentos
const TABS_DATA = [
    { name: "Lista de Orçamentos", path: "/dashboard/orcamentos", functionId: "orcamentos" },
    { name: "Modelos", path: "/dashboard/orcamentos/modelos", functionId: "orcamentos_modelos" },
    { name: "Personalizar", path: "/dashboard/orcamentos/personalizar", functionId: "orcamentos_personalizar" },
    { name: "Estatísticas", path: "/dashboard/orcamentos/estatisticas", functionId: "orcamentos_estatisticas" },
];

// O "href" para a ação de criar, como definido no catálogo de funções do admin.
const CREATE_ACTION_FUNCTION_ID = "orcamentos_criar";

export default function OrcamentosLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const { availableFunctions } = useAuth();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    const getFunctionIdByPath = (path: string) => {
        const func = availableFunctions.find(f => f.href === path);
        return func?.id || '';
    };

    // Lógica corrigida para encontrar a aba mais específica que corresponde ao início do pathname
    const currentTab = TABS_DATA
        .slice() // Cria uma cópia para não modificar o original
        .sort((a, b) => b.path.length - a.path.length) // Ordena da mais específica para a menos específica
        .find(tab => pathname.startsWith(tab.path))?.path || TABS_DATA[0].path;


    const createFunctionId = getFunctionIdByPath("/dashboard/orcamentos/criar") || CREATE_ACTION_FUNCTION_ID;

    return (
        <div className="flex flex-col h-full">
            <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6 sticky top-0 z-30 shrink-0">
                <div className="flex-1">
                    <Tabs value={currentTab} onValueChange={(value) => router.push(value)}>
                        <TabsList>
                            {TABS_DATA.map(tab => (
                                <ProtectedComponent key={tab.path} functionId={getFunctionIdByPath(tab.path) || tab.functionId} fallback={null}>
                                    <TabsTrigger value={tab.path}>{tab.name}</TabsTrigger>
                                </ProtectedComponent>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
                <ProtectedComponent functionId={createFunctionId} fallback={null}>
                     <Button size="sm" className="gap-1" onClick={() => setCreateModalOpen(true)}>
                        <PlusCircle className="h-4 w-4" />
                        <span>Orçamento</span>
                    </Button>
                </ProtectedComponent>
            </header>
            <div className="p-4 sm:px-6 sm:py-6">
                {children}
            </div>
            <CreateQuoteModal isOpen={isCreateModalOpen} onOpenChange={setCreateModalOpen} />
        </div>
    );
} 