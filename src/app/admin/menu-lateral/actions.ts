'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

type AppFunction = {
  id: string;
  name: string;
  href: string;
  isActive: boolean;
};

// Função para capitalizar o nome da pasta para criar um nome de função amigável
const formatFunctionName = (dir: string): string => {
  if (!dir) return '';
  return dir
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Lista de rotas conhecidas baseada na estrutura de pastas
const knownRoutes = [
  '/dashboard',
  '/dashboard/acompanhamento',
  '/dashboard/atividades',
  '/dashboard/base-de-clientes',
  '/dashboard/colaboradores',
  '/dashboard/configuracoes',
  '/dashboard/contratos',
  '/dashboard/indicacao',
  '/dashboard/inventario',
  '/dashboard/orcamentos',
  '/dashboard/perfil',
  '/dashboard/plans',
  '/dashboard/prazos',
  '/dashboard/servicos',
  '/dashboard/signup',
  '/dashboard/tutoriais',
  '/dashboard/whatsapp',
];

// Ação principal para sincronizar as funções
export async function syncFunctionsFromFiles() {
  try {
    const { dbAdmin } = await getFirebaseAdmin();
    const existingFunctions = new Map<string, AppFunction>();
    const discoveredFunctions: AppFunction[] = [];

    // 1. Obter funções existentes do Firestore usando o Admin SDK
    const menuConfigRef = dbAdmin.collection('siteConfig').doc('menu');
    const docSnap = await menuConfigRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      const funcs = (data?.availableFunctions || []) as AppFunction[];
      funcs.forEach(func => existingFunctions.set(func.href, func));
    }

    // 2. Processar a lista de rotas conhecidas
    for (const href of knownRoutes) {
        if (!existingFunctions.has(href)) {
            const name = href === '/dashboard' ? 'Dashboard' : formatFunctionName(href.split('/').pop() || '');
            discoveredFunctions.push({
                id: nanoid(8),
                name: name,
                href: href,
                isActive: true,
            });
        }
    }
    
    // 3. Mesclar e atualizar no Firestore se houver novas funções
    if (discoveredFunctions.length > 0) {
      const updatedFunctions = [...Array.from(existingFunctions.values()), ...discoveredFunctions];
      await menuConfigRef.update({
        availableFunctions: updatedFunctions,
      });
      console.log(`Sincronização concluída. ${discoveredFunctions.length} novas funções adicionadas.`);
    } else {
      console.log('Sincronização concluída. Nenhuma nova função encontrada.');
    }

    // 4. Revalidar o path para que a página admin veja as mudanças
    revalidatePath('/admin/menu-lateral');

    return {
      success: true,
      message: discoveredFunctions.length > 0
        ? `${discoveredFunctions.length} novas funções foram descobertas e adicionadas.`
        : 'Nenhuma nova função encontrada. Seu catálogo já está atualizado.',
      addedCount: discoveredFunctions.length
    };

  } catch (error) {
    console.error('Erro ao sincronizar funções:', error);
    return {
      success: false,
      message: 'Ocorreu um erro ao tentar sincronizar as funções a partir dos arquivos do projeto.',
      addedCount: 0
    };
  }
} 