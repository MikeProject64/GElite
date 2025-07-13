
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import * as gtag from '@/lib/utils';


export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie_consent_v1');
      if (!consent) {
        setIsVisible(true);
      }
    } catch (error) {
        // Handle environments where localStorage is not available.
        console.warn("Could not access localStorage for cookie consent.");
    }
  }, []);

  const handleAccept = () => {
    gtag.event({ action: 'cookie_consent_accept', params: {} });
    try {
      localStorage.setItem('cookie_consent_v1', 'accepted');
    } catch (error) {
        console.warn("Could not save cookie consent to localStorage.");
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-4 transition-transform duration-500',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Utilizamos cookies para lhe proporcionar a melhor experiência no nosso site.
        </p>
        <Button onClick={handleAccept} size="sm" className='shrink-0'>
          Aceito
        </Button>
      </div>
    </div>
  );
}
