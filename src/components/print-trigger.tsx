
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function PrintTrigger() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  useEffect(() => {
    // Only trigger print if not in preview mode
    if (!isPreview) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPreview]);

  return null;
}
