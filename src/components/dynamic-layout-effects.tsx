
'use client';

import { useEffect } from 'react';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import ReactDOMServer from 'react-dom/server';

const DynamicLayoutEffects = () => {
  const { settings, loadingSettings } = useSettings();

  useEffect(() => {
    if (settings.siteName) {
      document.title = settings.siteName;
    }
  }, [settings.siteName]);

  useEffect(() => {
    if (!loadingSettings && settings.iconName) {
      const IconComponent = availableIcons[settings.iconName as keyof typeof availableIcons];
      if (IconComponent) {
        // We need to get the actual HSL values for the primary color from the CSS variables
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
  }, [settings.iconName, loadingSettings]);

  return null;
};

export default DynamicLayoutEffects;
