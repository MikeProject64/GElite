
'use client';

import { useEffect } from 'react';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import ReactDOMServer from 'react-dom/server';

const defaultTitle = 'Gestor Elite';
const defaultPrimaryColor = { h: 210, s: 70, l: 40 };

const DynamicLayoutEffects = () => {
  const { settings, loadingSettings } = useSettings();

  useEffect(() => {
    if (loadingSettings) return;

    // APPLY NEW SETTINGS
    if (settings.siteName) {
      document.title = settings.siteName;
    }

    if (settings.primaryColorHsl) {
      const { h, s, l } = settings.primaryColorHsl;
      document.documentElement.style.setProperty('--primary-h', String(h));
      document.documentElement.style.setProperty('--primary-s', `${s}%`);
      document.documentElement.style.setProperty('--primary-l', `${l}%`);
    }

    if (settings.iconName) {
      const IconComponent = availableIcons[settings.iconName as keyof typeof availableIcons];
      if (IconComponent) {
        const h = getComputedStyle(document.documentElement).getPropertyValue('--primary-h').trim();
        const s = getComputedStyle(document.documentElement).getPropertyValue('--primary-s').trim();
        const l = getComputedStyle(document.documentElement).getPropertyValue('--primary-l').trim();
        const colorString = `hsl(${h}, ${s}, ${l})`;
        const svgString = ReactDOMServer.renderToString(<IconComponent color={colorString} size={32} />);
        const faviconUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`;
        
        let link: HTMLLinkElement | null = document.querySelector("link[id='dynamic-favicon']");
        if (!link) {
          link = document.createElement('link');
          link.id = 'dynamic-favicon';
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      }
    }

    // RETURN CLEANUP FUNCTION
    return () => {
      document.title = defaultTitle;
      
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--primary-h', String(defaultPrimaryColor.h));
      rootStyle.setProperty('--primary-s', `${defaultPrimaryColor.s}%`);
      rootStyle.setProperty('--primary-l', `${defaultPrimaryColor.l}%`);
      
      const faviconLink = document.querySelector("link[id='dynamic-favicon']");
      if (faviconLink) {
        faviconLink.remove();
      }
    };
  }, [settings, loadingSettings]);

  return null;
};

export default DynamicLayoutEffects;
