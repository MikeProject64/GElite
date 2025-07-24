'use client';

import { useAuth } from '@/components/auth-provider';
import { useCallback } from 'react';

/**
 * Hook para verificar permissões de função do usuário.
 * Centraliza a lógica de acesso baseada nas funções permitidas.
 */
export const usePermissions = () => {
  const { effectiveAllowedFunctions, loading: authLoading, userPlan, isAdmin } = useAuth();

  /**
   * Verifica se o usuário tem permissão para uma determinada função.
   * @param functionId O ID da função a ser verificada.
   * @returns `true` se o usuário tiver permissão, `false` caso contrário.
   */
  const hasPermission = useCallback(
    (functionId: string): boolean => {
      // Se nenhuma função for exigida, o acesso é permitido.
      if (!functionId) {
        return true;
      }

      // Se a lista de permissões não for válida, nega o acesso.
      if (!Array.isArray(effectiveAllowedFunctions)) {
        return false;
      }
      
      // Verifica se a função exigida está na lista de permissões do usuário.
      return effectiveAllowedFunctions.includes(functionId);
    },
    [effectiveAllowedFunctions] // Removido 'isAdmin' da dependência
  );
  
  /**
   * Verifica se o usuário atual tem um plano ativo (não é trial, etc.).
   * Pode ser usado para funcionalidades exclusivas de assinantes.
   */
  const hasActivePlan = !!userPlan; 

  return {
    hasPermission,
    hasActivePlan,
    isLoading: authLoading,
    allowedFunctions: effectiveAllowedFunctions,
  };
}; 