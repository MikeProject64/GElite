import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function GET() {
    const authorization = headers().get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Nenhum token de autorização fornecido.' }, { status: 401 });
    }

    try {
        const { adminAuth, dbAdmin } = await getFirebaseAdmin();
        const token = authorization.replace('Bearer ', '');
        const decodedToken = await adminAuth.verifyIdToken(token);
        
        const userId = decodedToken.uid;
        const chatsRef = dbAdmin.collection('users').doc(userId).collection('whatsapp_chats');
        const chatsSnapshot = await chatsRef.orderBy('lastMessageTimestamp', 'desc').get();

        if (chatsSnapshot.empty) {
            return NextResponse.json({}, { status: 200 });
        }

        const chatsData: { [key: string]: any } = {};

        for (const chatDoc of chatsSnapshot.docs) {
            const chatInfo = chatDoc.data();
            const messagesRef = chatDoc.ref.collection('messages').orderBy('timestamp', 'desc').limit(50);
            const messagesSnapshot = await messagesRef.get();

            const messages = messagesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp.toDate().toISOString(),
            })).reverse();

            // Evita erro se lastMessageTimestamp for nulo
            const lastMessageTimestamp = chatInfo.lastMessageTimestamp 
                ? chatInfo.lastMessageTimestamp.toDate().toISOString() 
                : new Date(0).toISOString();

            chatsData[chatDoc.id] = {
                id: chatDoc.id,
                ...chatInfo,
                lastMessageTimestamp,
                messages,
            };
        }

        return NextResponse.json(chatsData);

    } catch (error: any) {
        console.error('Erro ao buscar chats do WhatsApp:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
} 