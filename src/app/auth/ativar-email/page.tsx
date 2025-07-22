import { Suspense } from 'react';
import AtivarEmailComponent from './AtivarEmailComponent';

export default function AtivarEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><span>Carregando...</span></div>}>
      <AtivarEmailComponent />
    </Suspense>
  );
} 