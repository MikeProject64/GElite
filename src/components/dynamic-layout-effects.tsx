
'use client';

import { useEffect } from 'react';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import ReactDOMServer from 'react-dom/server';

const DynamicLayoutEffects = () => {
  const { settings, loadingSettings } = useSettings();

  useEffect(() => {
    if (loadingSettings) return;

    // Update title
    if (settings.siteName) {
      document.title = settings.siteName;
    }

    // Update favicon
    if (settings.iconName) {
      const IconComponent = availableIcons[settings.iconName as keyof typeof availableIcons];
      if (IconComponent) {
        // This is a client-side only operation
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        const svgString = ReactDOMServer.renderToString(
          <IconComponent color={`hsl(${primaryColor})`} size={32} />
        );
        const faviconUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`;
        
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      }
    }
  }, [settings, loadingSettings]);

  return null;
};

export default DynamicLayoutEffects;
