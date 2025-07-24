
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import * as gtag from '@/lib/utils';
import { Cookie } from 'lucide-react';


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
        'fixed bottom-4 right-4 z-[100] w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5',
        !isVisible && 'animate-out slide-out-to-bottom-5'
      )}
    >
        <div className="flex items-start gap-4">
            <Cookie className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div className='flex-grow'>
                <h4 className="font-semibold text-card-foreground">Nós usamos cookies</h4>
                <p className="text-sm text-muted-foreground mt-1">
                Utilizamos cookies para analisar o tráfego e melhorar sua experiência em nosso site.
                </p>
                <div className="mt-4 flex gap-2">
                    <Button onClick={handleAccept} size="sm" className='w-full'>
                    Aceitar
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
