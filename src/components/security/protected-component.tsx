'use client';

import React from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface ProtectedComponentProps {
  /**
   * O ID da função necessária para renderizar o componente filho.
   */
  functionId: string;
  /**
   * O componente a ser renderizado se o usuário tiver permissão.
   */
  children: React.ReactNode;
  /**
   * Um componente ou fallback opcional para renderizar durante o carregamento 
   * ou se a permissão for negada. Por padrão, não renderiza nada.
   */
  fallback?: React.ReactNode;
}

/**
 * Um componente que renderiza seus filhos apenas se o usuário atual
 * tiver a permissão para a `functionId` especificada.
 */
export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({ functionId, children, fallback = null }) => {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    // Durante o carregamento das permissões, pode-se optar por mostrar um loader
    // ou simplesmente não renderizar nada. O padrão é não renderizar.
    return fallback;
  }

  if (!hasPermission(functionId)) {
    return fallback;
  }

  return <>{children}</>;
}; 