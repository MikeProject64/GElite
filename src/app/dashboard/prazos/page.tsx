
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { ServiceOrder } from '@/types';
import { DeadlinesClient } from './deadlines-client';
import { unstable_noStore as noStore } from 'next/cache';

// Fetch data on the server
async function getServiceOrders(userId: string) {
    noStore(); // Ensure data is fetched on every request
    if (!userId) return [];
    
    const q = query(
        collection(db, "serviceOrders"), 
        where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    const fetchedOrders = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder))
        .filter(order => order.dueDate && !order.isTemplate) // Filter out templates and orders without due dates
        .sort((a,b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime());
        
    return fetchedOrders;
}


export default async function PrazosPage() {
    // Since this is a server component, we can't use useAuth directly.
    // We would typically get the user session here. For now, assuming we get the UID.
    // In a real app with server-side auth, you'd get the user from the session.
    // For the purpose of this structure, we'll assume a placeholder mechanism or
    // rely on the client component to handle auth context.
    const initialOrders: ServiceOrder[] = []; 

    // The data fetching will be triggered inside the client component based on the user's auth state.
    // This is a common pattern when dealing with client-side authentication like Firebase Auth.
    
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Prazos de Entrega</h1>
            <DeadlinesClient />
        </div>
    );
}

