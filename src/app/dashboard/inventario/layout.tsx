'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { usePermissions } from '@/hooks/use-permissions';
import { ProtectedComponent } from '@/components/security/protected-component';
import { useAuth } from '@/components/auth-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ItemForm } from '@/components/forms/item-form'; // Precisaremos criar este form

const TABS_DATA = [
    { name: "Lista de Itens", path: "/dashboard/inventario", functionId: "inventario" },
    { name: "Estatísticas", path: "/dashboard/inventario/estatisticas", functionId: "inventario_estatisticas" },
];

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { availableFunctions } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const getFunctionIdByPath = (path: string) => {
        return availableFunctions.find(f => f.href === path)?.id || '';
    };

    const currentTab = TABS_DATA
        .slice()
        .sort((a, b) => b.path.length - a.path.length)
        .find(tab => pathname.startsWith(tab.path))?.path || TABS_DATA[0].path;

    const createFuncId = getFunctionIdByPath("/dashboard/inventario") || 'inventario';

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
                <ProtectedComponent functionId={createFuncId}>
                    <Button size="sm" className="gap-1" onClick={() => setIsModalOpen(true)}>
                        <PlusCircle className="h-4 w-4" />
                        <span>Adicionar Item</span>
                    </Button>
                </ProtectedComponent>
            </header>
            <div className="p-4 sm:px-6 sm:py-6">
                {children}
            </div>
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle>Adicionar Novo Item</DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes para adicionar um novo item ao seu inventário.
                    </DialogDescription>
                    </DialogHeader>
                    <ItemForm onSuccess={() => setIsModalOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    );
} 