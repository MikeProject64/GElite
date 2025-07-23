'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

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

// Nova função para buscar rotas recursivamente
async function findRoutes(directory: string, baseHref: string = '/dashboard'): Promise<string[]> {
  let routes: string[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const href = path.join(baseHref, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
        const pagePath = path.join(fullPath, 'page.tsx');
        try {
            await fs.access(pagePath);
            routes.push(href);
            // Continua a busca recursiva
            routes = routes.concat(await findRoutes(fullPath, href));
        } catch (error) {
            // Se não houver page.tsx, apenas continue a busca recursiva na subpasta
            routes = routes.concat(await findRoutes(fullPath, href));
        }
    }
  }
  return routes;
}


// Ação principal para sincronizar as funções
export async function syncFunctionsFromFiles() {
  try {
    const { dbAdmin } = await getFirebaseAdmin();
    const existingFunctions = new Map<string, AppFunction>();
    let discoveredFunctions: AppFunction[] = [];

    // 1. Obter funções existentes do Firestore
    const menuConfigRef = dbAdmin.collection('siteConfig').doc('menu');
    const docSnap = await menuConfigRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      const funcs = (data?.availableFunctions || []) as AppFunction[];
      funcs.forEach(func => existingFunctions.set(func.href, func));
    }

    // 2. Buscar rotas do sistema de arquivos
    const dashboardPath = path.join(process.cwd(), 'src', 'app', 'dashboard');
    const discoveredRoutes = await findRoutes(dashboardPath);
    
    // Adicionar a rota raiz /dashboard se ela existir
    try {
        await fs.access(path.join(dashboardPath, 'page.tsx'));
        if (!discoveredRoutes.includes('/dashboard')) {
            discoveredRoutes.unshift('/dashboard');
        }
    } catch(e) {
        // ignora o erro
    }


    // 3. Processar rotas descobertas
    for (const href of discoveredRoutes) {
        if (!existingFunctions.has(href)) {
            const name = href === '/dashboard' 
                ? 'Dashboard' 
                : formatFunctionName(href.split('/').pop() || '');
                
            discoveredFunctions.push({
                id: nanoid(8),
                name: name,
                href: href,
                isActive: true,
            });
        }
    }
    
    // 4. Mesclar e atualizar no Firestore
    if (discoveredFunctions.length > 0) {
      const updatedFunctions = [...Array.from(existingFunctions.values()), ...discoveredFunctions];
      await menuConfigRef.update({
        availableFunctions: updatedFunctions,
      });
      console.log(`Sincronização concluída. ${discoveredFunctions.length} novas funções adicionadas.`);
    } else {
      console.log('Sincronização concluída. Nenhuma nova função encontrada.');
    }

    // 5. Revalidar o path
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
      message: 'Ocorreu um erro ao tentar sincronizar as funções a partir dos arquivos do projeto. Verifique os logs do servidor.',
      addedCount: 0
    };
  }
} 