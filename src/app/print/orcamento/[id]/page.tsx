
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Quote, UserSettings } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wrench, Loader2 } from 'lucide-react';
import { PrintTrigger } from '@/components/print-trigger';
import { availableIcons } from '@/components/icon-map';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function PrintOrcamentoPage() {
    const { id } = useParams();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setIsLoading(false);
            return;
        }

        const quoteId = Array.isArray(id) ? id[0] : id;

        const fetchQuoteAndSettings = async () => {
            const quoteRef = doc(db, 'quotes', quoteId);
            const quoteSnap = await getDoc(quoteRef);

            if (!quoteSnap.exists()) {
                setIsLoading(false);
                notFound();
                return;
            }

            const quoteData = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;
            setQuote(quoteData);

            let userSettings: UserSettings = { siteName: 'ServiceWise', iconName: 'Wrench' };
            if (quoteData.userId) {
                const settingsRef = doc(db, 'userSettings', quoteData.userId);
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    userSettings = { ...userSettings, ...settingsSnap.data() };
                }
            }
            setSettings(userSettings);
            setIsLoading(false);
        };

        fetchQuoteAndSettings().catch(err => {
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
    
    if (!quote || !settings) {
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
                        <p className="text-sm text-gray-500">Proposta de Serviço</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-headline font-semibold">Orçamento #{quote.id.substring(0, 6).toUpperCase()}</h2>
                    <p className="text-sm text-gray-500">Data: {format(quote.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
            </header>

            <main className="my-8">
                <section className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Para</h3>
                        <p className="font-bold">{quote.clientName}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Validade</h3>
                        <p className="font-bold">{format(quote.validUntil.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b">Descrição dos Itens</h3>
                    <div className="bg-gray-50 p-4 rounded-md mt-2">
                        <p className="whitespace-pre-wrap text-sm">{quote.description}</p>
                    </div>
                </section>
            </main>

            <footer className="pt-4 border-t-2 border-gray-200">
                <div className="text-right">
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="text-3xl font-bold font-headline">{formatCurrency(quote.totalValue)}</p>
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
