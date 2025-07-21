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

export async function GET() {
    const sessionCookie = cookies().get('session');
    const user = await verifySessionCookie(sessionCookie);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const sessionsRef = db.collection('users').doc(user.uid).collection('whatsapp_sessions');
        const snapshot = await sessionsRef.get();

        if (snapshot.empty) {
            return NextResponse.json([]);
        }

        const sessionsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json(sessionsList);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const sessionCookie = cookies().get('session');
    const user = await verifySessionCookie(sessionCookie);

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, name } = await request.json();
        if (!id || !name) {
            return NextResponse.json({ error: 'Session ID and name are required' }, { status: 400 });
        }

        const sessionRef = db.collection('users').doc(user.uid).collection('whatsapp_sessions').doc(id);
        await sessionRef.set({ name, createdAt: new Date() });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
