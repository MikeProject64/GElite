import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { adminAuth, dbAdmin } = await getFirebaseAdmin();
    const { token } = await req.json();
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
    if (tokenData.expiresAt.toDate() < new Date()) {
      return NextResponse.json({ error: 'Token expirado.' }, { status: 400 });
    }
    // Marcar e-mail como verificado
    await adminAuth.updateUser(tokenData.userId, { emailVerified: true });
    await tokenRef.update({ used: true });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao ativar e-mail.' }, { status: 500 });
  }
} 