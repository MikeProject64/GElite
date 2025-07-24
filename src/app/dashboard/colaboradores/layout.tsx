"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User, Settings, PlusCircle } from "lucide-react";
import { useState } from "react";

const TABS_DATA = [
  { name: "Colaboradores", path: "/dashboard/colaboradores", icon: User },
  { name: "Acessos", path: "/dashboard/acessos", icon: Settings },
];

export default function ColaboradoresLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Encontra a tab ativa
  const currentTab = TABS_DATA
    .slice()
    .sort((a, b) => b.path.length - a.path.length)
    .find(tab => pathname.startsWith(tab.path))?.path || TABS_DATA[0].path;

  // Define a ação do botão (pode ser customizada por página)
  const actionButton = (
    <Button size="sm" className="gap-1" id="header-add-novo" type="button" onClick={() => window.dispatchEvent(new CustomEvent('abrir-modal-colaborador'))}>
      <PlusCircle className="h-4 w-4" />
      <span>Adicionar Novo Colaborador</span>
    </Button>
  );

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6 sticky top-0 z-30 shrink-0">
        <div className="flex-1">
          <Tabs value={currentTab} onValueChange={value => router.push(value)}>
            <TabsList>
              {TABS_DATA.map(tab => (
                <TabsTrigger key={tab.path} value={tab.path} className="flex items-center gap-2">
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {actionButton}
      </header>
      <div className="p-4 sm:px-6 sm:py-6">{children}</div>
      {/* Modal de adicionar colaborador pode ser implementado aqui se necessário */}
    </div>
  );
} 