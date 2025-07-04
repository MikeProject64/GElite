'use client';

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    // Timeout to allow content to render before printing
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
