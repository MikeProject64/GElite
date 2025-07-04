import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { Quote } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wrench } from 'lucide-react';
import { PrintTrigger } from '@/components/print-trigger';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

async function getQuote(id: string): Promise<Quote | null> {
    const quoteRef = doc(db, 'quotes', id);
    const quoteSnap = await getDoc(quoteRef);
    if (!quoteSnap.exists()) {
        return null;
    }
    return { id: quoteSnap.id, ...quoteSnap.data() } as Quote;
}

export default async function PrintOrcamentoPage({ params }: { params: { id: string } }) {
    const quote = await getQuote(params.id);

    if (!quote) {
        notFound();
    }
    
    // In a real app, you might fetch user-specific settings (like company name/logo) here.
    const siteName = 'ServiceWise';
    const Icon = Wrench;

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
