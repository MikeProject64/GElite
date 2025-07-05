
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ServiceOrder, UserSettings } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wrench, Loader2 } from 'lucide-react';
import { PrintTrigger } from '@/components/print-trigger';
import { availableIcons } from '@/components/icon-map';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function PrintServicoPage() {
    const { id } = useParams();
    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setIsLoading(false);
            return;
        }

        const orderId = Array.isArray(id) ? id[0] : id;

        const fetchOrderAndSettings = async () => {
            const orderRef = doc(db, 'serviceOrders', orderId);
            const orderSnap = await getDoc(orderRef);

            if (!orderSnap.exists()) {
                setIsLoading(false);
                notFound();
                return;
            }

            const orderData = { id: orderSnap.id, ...orderSnap.data() } as ServiceOrder;
            setOrder(orderData);

            let userSettings: UserSettings = { siteName: 'ServiceWise', iconName: 'Wrench' };
            if (orderData.userId) {
                const settingsRef = doc(db, 'userSettings', orderData.userId);
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    userSettings = { ...userSettings, ...settingsSnap.data() };
                }
            }
            setSettings(userSettings);
            setIsLoading(false);
        };

        fetchOrderAndSettings().catch(err => {
            console.error(err);
            setIsLoading(false);
        });

    }, [id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!order || !settings) {
        return null;
    }
    
    const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
    const siteName = settings.siteName || 'ServiceWise';

    return (
        <div className="max-w-4xl mx-auto p-8 font-body text-gray-800 bg-white">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
                <div className="flex items-center gap-3">
                    <Icon className="h-10 w-10 text-primary" />
                    <div>
                        <h1 className="text-3xl font-headline font-bold text-gray-900">{siteName}</h1>
                        <p className="text-sm text-gray-500">Ordem de Serviço</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-headline font-semibold">OS #{order.id.substring(0, 6).toUpperCase()}</h2>
                    <p className="text-sm text-gray-500">Data: {format(order.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
            </header>

            <main className="my-8">
                <section className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Cliente</h3>
                        <p className="font-bold">{order.clientName}</p>
                    </div>
                     <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Colaborador / Setor</h3>
                        <p className="font-bold">{order.collaboratorName || 'Não definido'}</p>
                    </div>
                     <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Prazo de Entrega</h3>
                        <p className="font-bold">{format(order.dueDate.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                     <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Status Atual</h3>
                        <p className="font-bold">{order.status}</p>
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b">Descrição do Problema / Serviço</h3>
                    <div className="bg-gray-50 p-4 rounded-md mt-2">
                        <p className="whitespace-pre-wrap text-sm">{order.problemDescription}</p>
                    </div>
                </section>

                {order.attachments && order.attachments.length > 0 && (
                    <section className="mt-8 no-print">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b">Anexos</h3>
                        <p className="text-xs text-gray-500">Anexos não são incluídos na impressão.</p>
                        <ul className="list-disc pl-5">
                            {order.attachments.map((file, i) => <li key={i} className="text-sm">{file.name}</li>)}
                        </ul>
                    </section>
                )}
            </main>

            <footer className="pt-4 border-t-2 border-gray-200">
                 <div className="text-right">
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="text-3xl font-bold font-headline">{formatCurrency(order.totalValue)}</p>
                </div>
                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>Obrigado pela sua preferência!</p>
                    <p>{siteName}</p>
                </div>
            </footer>
            
            <PrintTrigger />
        </div>
    );
}
