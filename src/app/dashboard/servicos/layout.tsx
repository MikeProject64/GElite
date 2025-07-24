'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateServiceOrderModal } from '@/components/create-service-order-modal';
import { usePermissions } from '@/hooks/use-permissions';
import { ProtectedComponent } from '@/components/security/protected-component';
import { useAuth } from '@/components/auth-provider';

const TABS_DATA = [
    { path: '/dashboard/servicos', label: 'Lista de serviços', functionId: 'servicos' },
    { path: '/dashboard/prazos', label: 'Agenda', functionId: 'prazos' },
    { path: '/dashboard/servicos/modelos', label: 'Modelos', functionId: 'servicos_modelos' },
    { path: '/dashboard/servicos/personalizar', label: 'Personalizar', functionId: 'servicos_personalizar' },
    { path: '/dashboard/servicos/estatisticas', label: 'Estatísticas', functionId: 'servicos_estatisticas' },
];

const CREATE_ACTION_HREF = '/dashboard/servicos/criar';

export default function ServicosLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { availableFunctions } = useAuth();
    const { hasPermission } = usePermissions();

    const getFunctionIdByPath = (path: string) => {
        const func = availableFunctions.find(f => f.href === path);
        return func?.id || '';
    };

    const createFuncId = getFunctionIdByPath(CREATE_ACTION_HREF) || 'servicos_criar';

    const currentTab = TABS_DATA.find(tab => pathname.startsWith(tab.path))?.path || TABS_DATA[0].path;

    return (
        <div className="flex flex-col h-full">
            <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6 sticky top-0 z-30 shrink-0">
                <div className="flex-1">
                    <Tabs value={currentTab} onValueChange={(value) => router.push(value)}>
                        <TabsList>
                            {TABS_DATA.map((tab) => (
                                <ProtectedComponent key={tab.path} functionId={getFunctionIdByPath(tab.path) || tab.functionId} fallback={null}>
                                    <TabsTrigger value={tab.path}>{tab.label}</TabsTrigger>
                                </ProtectedComponent>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
                <ProtectedComponent functionId={createFuncId} fallback={null}>
                    <Button size="sm" className="gap-1" onClick={() => setIsCreateModalOpen(true)}>
                        <PlusCircle className="h-4 w-4" />
                        <span>Ordem de Serviço</span>
                    </Button>
                </ProtectedComponent>
            </header>
            
            <div className="p-4 sm:px-6 sm:py-6">
                {children}
            </div>
            
            <CreateServiceOrderModal isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </div>
    );
} 