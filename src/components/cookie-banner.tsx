
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import * as gtag from '@/lib/utils';
import { X } from 'lucide-react';


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

  const handleDismiss = () => {
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
        'fixed bottom-4 right-4 z-[100] w-full max-w-sm rounded-lg border bg-card p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5',
        !isVisible && 'animate-out slide-out-to-bottom-5'
      )}
    >
      <div className="relative pr-6">
          <h4 className="font-semibold text-card-foreground">Nós usamos cookies</h4>
          <p className="text-sm text-muted-foreground mt-1">
          Utilizamos cookies para analisar o tráfego e melhorar sua experiência em nosso site.
          </p>
           <Button 
                variant="ghost" 
                size="icon" 
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
      </div>
    </div>
  );
}
