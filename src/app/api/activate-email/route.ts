import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { adminAuth, dbAdmin } = await getFirebaseAdmin();
    const { token, novaSenha, soAtivar } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Token não informado.' }, { status: 400 });
    }
    const tokenRef = dbAdmin.collection('activationTokens').doc(token);
    const tokenSnap = await tokenRef.get();
    const tokenData = tokenSnap.data();
    if (!tokenSnap.exists || !tokenData) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }
    if (tokenData.used) {
      return NextResponse.json({ error: 'Token já utilizado.' }, { status: 400 });
    }
    // Só ativar o e-mail, não marcar como usado ainda
    if (soAtivar) {
      await adminAuth.updateUser(tokenData.userId, { emailVerified: true });
      return NextResponse.json({ success: true });
    }
    // Se veio novaSenha, ativa e marca como usado
    if (novaSenha) {
      if (typeof novaSenha !== 'string' || novaSenha.length < 6) {
        return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
      }
      await adminAuth.updateUser(tokenData.userId, { emailVerified: true, password: novaSenha });
      await tokenRef.update({ used: true });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao ativar e-mail.' }, { status: 500 });
  }
} 