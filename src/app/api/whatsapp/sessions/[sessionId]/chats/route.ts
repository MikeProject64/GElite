import { NextResponse } from 'next/server';
import { admin, db } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

async function verifySessionCookie(cookie: any) {
    if (!cookie) return null;
    try {
        const decodedClaims = await admin.auth().verifySessionCookie(cookie.value, true);
        return decodedClaims;
    } catch (error) {
        return null;
    }
}

export async function GET(request: Request, { params }: { params: { sessionId: string } }) {
    const sessionCookie = cookies().get('session');
    const user = await verifySessionCookie(sessionCookie);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = params;

    try {
        const chatsRef = db.collection('users').doc(user.uid).collection('whatsapp_sessions').doc(sessionId).collection('chats');
        const snapshot = await chatsRef.get();

        if (snapshot.empty) {
            return NextResponse.json({});
        }

        const chats: Record<string, any> = {};
        snapshot.docs.forEach(doc => {
            chats[doc.id] = { id: doc.id, ...doc.data(), messages: [] }; // Messages will be fetched on demand
        });

        return NextResponse.json(chats);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }
}
