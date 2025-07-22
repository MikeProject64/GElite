'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getAuth } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function AtivarEmailPage() {
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('Validando token...');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    async function activate() {
      if (!token) {
        setStatus('error');
        setMessage('Token não informado.');
        return;
      }
      try {
        // Chama API para ativar o e-mail
        const res = await fetch('/api/activate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage('E-mail ativado com sucesso! Você já pode acessar sua conta.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Token inválido ou expirado.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage('Erro ao ativar e-mail.');
      }
    }
    activate();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {status === 'loading' && <Loader2 className="animate-spin h-8 w-8 mb-4" />}
      <h1 className="text-2xl font-bold mb-2">Ativação de E-mail</h1>
      <p className={status === 'error' ? 'text-red-600' : 'text-green-700'}>{message}</p>
      {status === 'success' && (
        <button className="mt-6 px-4 py-2 bg-primary text-white rounded" onClick={() => router.push('/login')}>Ir para Login</button>
      )}
    </div>
  );
} 