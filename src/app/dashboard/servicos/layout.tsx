'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateServiceOrderModal } from '@/components/create-service-order-modal';

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
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const currentTab = tabs.find(tab => pathname === tab.path)?.path || '/dashboard/servicos';

    return (
        <>
            <div className="flex flex-col gap-4 w-full">
                <div className="flex justify-center items-center gap-4">
                    <Tabs value={currentTab} onValueChange={(value) => router.push(value)}>
                        <TabsList>
                            {tabs.map((tab) => (
                                <TabsTrigger key={tab.path} value={tab.path} asChild>
                                    <Link href={tab.path}>{tab.label}</Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    <Button size="sm" className="h-8 gap-1" onClick={() => setIsCreateModalOpen(true)}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Ordem de Serviço</span>
                    </Button>
                </div>

                <div className="mt-4">
                    {children}
                </div>
            </div>
            <CreateServiceOrderModal isOpen={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </>
    );
} 