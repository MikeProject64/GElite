import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/server-auth';
import UsersClientPage from './users-client';

async function getUsersAndPlans() {
    await verifyAdmin(); // Protege a rota no servidor
    const { dbAdmin } = await getFirebaseAdmin();

    const usersQuery = dbAdmin.collection('users').orderBy('createdAt', 'desc');
    const plansQuery = dbAdmin.collection('plans').orderBy('monthlyPrice', 'asc');

    const [usersSnapshot, plansSnapshot] = await Promise.all([
        usersQuery.get(),
        plansQuery.get(),
    ]);

    // Converte os dados para um formato serializável (JSON) que pode ser passado do servidor para o cliente.
    // Timestamps do Firebase são convertidos para strings ISO.
    const serializableUsers = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        const serializableData: { [key: string]: any } = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value && typeof value.toDate === 'function') {
                serializableData[key] = value.toDate().toISOString();
            } else {
                serializableData[key] = value;
            }
        });
        return {
            ...serializableData,
            uid: doc.id,
        }
    });

    const serializablePlans = plansSnapshot.docs.map(doc => {
        const data = doc.data();
        const serializableData: { [key: string]: any } = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value && typeof value.toDate === 'function') {
                serializableData[key] = value.toDate().toISOString();
            } else {
                serializableData[key] = value;
            }
        });
        return {
            ...serializableData,
            id: doc.id,
        }
    });

    return { users: serializableUsers, plans: serializablePlans as any[] };
}

export default async function AdminUsersPage() {
    const { users, plans } = await getUsersAndPlans();
    return <UsersClientPage initialUsers={users} initialPlans={plans as any[]} />;
}
