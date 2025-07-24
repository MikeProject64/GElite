'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserPlus, Wrench } from "lucide-react";
import { ProtectedComponent } from '@/components/security/protected-component';
import { useAuth } from '@/components/auth-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomerForm } from '@/components/forms/customer-form';
import { MessageSquare } from 'lucide-react';

const TABS_DATA = [
    { name: "Lista de Clientes", path: "/dashboard/base-de-clientes", functionId: "clientes" },
    { name: "WhatsApp", path: "/dashboard/whatsapp", functionId: "whatsapp" },
    { name: "Personalizar Campos", path: "/dashboard/base-de-clientes/personalizar", functionId: "clientes_personalizar" },
];

export function CustomersLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { availableFunctions } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const getFunctionIdByPath = (path: string) => {
        return availableFunctions.find(f => f.href === path)?.id || '';
    };

    // This logic ensures the correct tab is highlighted, even on nested routes.
    const currentTab = TABS_DATA
        .slice()
        .sort((a, b) => b.path.length - a.path.length) // Sort to check for more specific paths first
        .find(tab => pathname.startsWith(tab.path))?.path || '';
    
    const createFuncId = getFunctionIdByPath("/dashboard/base-de-clientes") || 'clientes_criar';
    const customizeFuncId = getFunctionIdByPath("/dashboard/base-de-clientes/personalizar") || 'clientes_personalizar';

    const handleSuccess = () => {
        setIsModalOpen(false);
    }

    return (
        <div className="flex flex-col h-full">
            <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6 sticky top-0 z-30 shrink-0">
                <div className="flex-1">
                    <Tabs value={currentTab} onValueChange={(value) => router.push(value)}>
                        <TabsList>
                            <ProtectedComponent functionId={getFunctionIdByPath("/dashboard/base-de-clientes") || 'clientes'}>
                                <TabsTrigger value="/dashboard/base-de-clientes">Lista de Clientes</TabsTrigger>
                            </ProtectedComponent>
                             <ProtectedComponent functionId={getFunctionIdByPath("/dashboard/whatsapp") || 'whatsapp'}>
                                <TabsTrigger value="/dashboard/whatsapp">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        <span>WhatsApp</span>
                                    </div>
                                </TabsTrigger>
                            </ProtectedComponent>
                            <ProtectedComponent functionId={customizeFuncId}>
                                <TabsTrigger value="/dashboard/base-de-clientes/personalizar">Personalizar</TabsTrigger>
                            </ProtectedComponent>
                        </TabsList>
                    </Tabs>
                </div>
                <ProtectedComponent functionId={createFuncId}>
                    <Button size="sm" className="gap-1" onClick={() => setIsModalOpen(true)}>
                        <UserPlus className="h-4 w-4" />
                        <span>Novo Cliente</span>
                    </Button>
                </ProtectedComponent>
            </header>
            <main className="p-4 sm:p-6 flex-1 bg-muted/20">
                {children}
            </main>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Cliente</DialogTitle>
                        <DialogDescription>
                            Preencha os dados abaixo para cadastrar um novo cliente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-1">
                        <CustomerForm onSuccess={handleSuccess} onCancel={() => setIsModalOpen(false)} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 