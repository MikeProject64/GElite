import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { adminAuth, dbAdmin } = await getFirebaseAdmin();
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const idToken = authHeader.replace('Bearer ', '');
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userId = decoded.uid;
    const user = await adminAuth.getUser(userId);
    const userEmail = user.email;
    const userName = user.displayName || 'Usuário';
    if (!userEmail) {
      return NextResponse.json({ error: 'Usuário sem e-mail.' }, { status: 400 });
    }

    // Gerar token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await dbAdmin.collection('activationTokens').doc(token).set({
      userId,
      expiresAt,
      used: false,
    });

    // Buscar modelo e SMTP
    const configSnap = await dbAdmin.collection('siteConfig').doc('main').get();
    const config = configSnap.data() || {};
    const subject = config.activationEmailSubject || 'Ative sua conta';
    const body = config.activationEmailBody || 'Olá {NOME},<br>Ative sua conta: {LINK}';
    const smtpHost = config.smtpHost;
    const smtpPort = config.smtpPort;
    const smtpUser = config.smtpUser;
    const smtpPassword = config.smtpPassword;
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      return NextResponse.json({ error: 'Configuração SMTP incompleta.' }, { status: 500 });
    }

    // Montar link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const link = `${baseUrl}/auth/ativar-email?token=${token}`;
    const html = body.replace(/\{NOME\}/g, userName).replace(/\{LINK\}/g, link);

    // Enviar e-mail
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transporter.sendMail({
      from: `"Gestor Elite" <${smtpUser}>`,
      to: userEmail,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao enviar e-mail.' }, { status: 500 });
  }
} 