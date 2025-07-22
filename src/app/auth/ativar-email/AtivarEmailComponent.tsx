'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AtivarEmailComponent() {
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('Validando token...');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
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
        const res = await fetch('/api/activate-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage('E-mail ativado com sucesso! Agora crie sua senha para acessar sua conta.');
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!password || password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('As senhas não coincidem.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/activate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: password }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordSuccess('Senha criada com sucesso! Agora você pode fazer login.');
        setShowPasswordForm(false);
      } else {
        setPasswordError(data.error || 'Erro ao criar senha.');
      }
    } catch (err: any) {
      setPasswordError('Erro ao criar senha.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gradient-to-br from-[#f8fafc] to-[#e0e7ef] py-8 px-2">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-headline font-bold text-primary mb-2 tracking-tight">Gestor Elite</h2>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-2 text-center">Ativação de E-mail</h1>
        <p className={
          'mb-4 text-center ' +
          (status === 'error' ? 'text-red-600' : 'text-green-700')
        }>{message}</p>
        {status === 'loading' && <Loader2 className="animate-spin h-8 w-8 mb-4 text-primary" />}
        {status === 'success' && !showPasswordForm && !passwordSuccess && (
          <button className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-medium shadow hover:bg-primary/90 transition" onClick={() => setShowPasswordForm(true)}>
            Criar senha
          </button>
        )}
        {showPasswordForm && (
          <form className="mt-4 w-full flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
            <div>
              <label className="block mb-1 font-medium text-gray-700">Nova senha</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700">Confirmar senha</label>
              <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} required />
            </div>
            {passwordError && <p className="text-red-600 text-sm text-center">{passwordError}</p>}
            <button type="submit" className="bg-primary text-white rounded-lg px-4 py-2 font-medium shadow hover:bg-primary/90 transition" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Senha'}
            </button>
          </form>
        )}
        {passwordSuccess && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-green-700 text-center">{passwordSuccess}</p>
            <button className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium shadow hover:bg-primary/90 transition" onClick={() => router.push('/login')}>
              Ir para Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 