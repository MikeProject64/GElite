
'use client';

import { useEffect } from 'react';
import { useSettings } from './settings-provider';

const DynamicLayoutEffects = () => {
  const { settings, loadingSettings } = useSettings();

  useEffect(() => {
    if (loadingSettings || typeof window === 'undefined') return;

    // Atualiza o título da página do lado do cliente para navegações SPA
    // A renderização inicial do servidor já cuidou do título na primeira carga.
    if (settings.siteName) {
      document.title = settings.siteName;
    }

  }, [settings, loadingSettings]);

  // A lógica de cor e favicon foi movida para o RootLayout (servidor)
  // para evitar o "flash" de conteúdo. Este componente agora só cuida de
  // atualizações que fazem sentido no lado do cliente, como o título da página
  // durante a navegação entre rotas no Next.js.

  return null;
};

export default DynamicLayoutEffects;
