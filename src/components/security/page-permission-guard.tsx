'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

/**
 * Mapeia rotas para as `functionId`s correspondentes.
 * Este mapa é a "ponte" entre a URL e o sistema de permissões.
 * É crucial manter este mapa atualizado com as funções do sistema.
 */
const getFunctionIdForPath = (path: string, allFunctions: any[]): string | null => {
  // Encontra a correspondência mais específica primeiro
  const exactMatch = allFunctions.find(f => f.href === path);
  if (exactMatch) return exactMatch.id;

  // Lógica para correspondências de sub-rotas (ex: /dashboard/servicos/ID_DO_SERVICO)
  // Ordena da mais longa para a mais curta para garantir que /a/b/c seja verificado antes de /a/b
  const sortedFunctions = [...allFunctions].sort((a, b) => b.href.length - a.href.length);
  const parentMatch = sortedFunctions.find(f => path.startsWith(f.href + '/'));
  if (parentMatch) return parentMatch.id;
  
  // Casos especiais que não exigem permissão ou são sempre permitidos
  const publicPaths = ['/dashboard'];
  if (publicPaths.includes(path)) {
    return null; // Nenhuma permissão específica necessária
  }

  // Se nenhuma correspondência for encontrada, por padrão, o acesso não é determinado aqui.
  // Pode-se optar por negar por padrão se um caminho não for mapeado.
  return null; 
};


const AccessDenied: React.FC = () => (
  <div className="flex items-center justify-center h-full p-4">
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>
        <CardTitle className="mt-4">Acesso Negado</CardTitle>
        <CardDescription>
          Você não tem permissão para acessar esta página. Verifique seu plano ou entre em contato com o administrador da sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/dashboard">Voltar para o Painel</Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);

const LoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
)

export const PagePermissionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { availableFunctions, loading: authLoading } = useAuth();
  
  const [requiredPermission, setRequiredPermission] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!authLoading && availableFunctions.length > 0) {
      const functionId = getFunctionIdForPath(pathname, availableFunctions);
      setRequiredPermission(functionId);
      setHasChecked(true);
    }
  }, [pathname, availableFunctions, authLoading]);

  const isLoading = permissionsLoading || authLoading || !hasChecked;

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Se a rota não exige uma permissão específica, permite o acesso.
  if (!requiredPermission) {
    return <>{children}</>;
  }

  if (hasPermission(requiredPermission)) {
    return <>{children}</>;
  }

  return <AccessDenied />;
}; 