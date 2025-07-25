
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Quote, UserSettings, SystemUser, Customer } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { PrintTrigger } from '@/components/print-trigger';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function PrintOrcamentoPage() {
    const { id } = useParams();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [customer, setCustomer] = useState<Partial<Customer>>({});
    const [settings, setSettings] = useState<Partial<UserSettings>>({});
    const [accountOwner, setAccountOwner] = useState<SystemUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setIsLoading(false);
            return;
        }

        const quoteId = Array.isArray(id) ? id[0] : id;

        const fetchQuoteAndSettings = async () => {
            try {
                const quoteRef = doc(db, 'quotes', quoteId);
                const quoteSnap = await getDoc(quoteRef);

                if (!quoteSnap.exists()) {
                    notFound();
                    return;
                }

                const quoteData = { id: quoteSnap.id, ...quoteSnap.data() } as Quote;
                setQuote(quoteData);

                if (quoteData.userId) {
                    // Fetch global settings from siteConfig
                    const globalSettingsRef = doc(db, 'siteConfig', 'main');
                    const globalSettingsSnap = await getDoc(globalSettingsRef);
                    const globalSettingsData = globalSettingsSnap.exists() ? globalSettingsSnap.data() : {};

                    // Fetch user-specific settings (which includes custom fields)
                    const userSettingsRef = doc(db, 'userSettings', quoteData.userId);
                    const userSettingsSnap = await getDoc(userSettingsRef);
                    const userSettingsData = userSettingsSnap.exists() ? userSettingsSnap.data() : {};

                    // Merge settings, giving user settings precedence
                    setSettings({ ...globalSettingsData, ...userSettingsData });

                    // Fetch account owner details
                    const ownerRef = doc(db, 'users', quoteData.userId);
                    const ownerSnap = await getDoc(ownerRef);
                    if(ownerSnap.exists()) {
                        setAccountOwner(ownerSnap.data() as SystemUser);
                    }
                }
                
                if (quoteData.clientId) {
                    const customerRef = doc(db, 'customers', quoteData.clientId);
                    const customerSnap = await getDoc(customerRef);
                    if (customerSnap.exists()) {
                        setCustomer(customerSnap.data());
                    }
                }

            } catch (err) {
                console.error("Error fetching print data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuoteAndSettings();

    }, [id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!quote) {
        return null;
    }
    
    const siteName = accountOwner?.companyName || accountOwner?.name || settings.siteName || 'Gestor Elite';

    return (
        <div className="max-w-4xl mx-auto p-8 font-sans text-gray-800 bg-white">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{siteName}</h1>
                    {accountOwner?.cpfCnpj && <p className="text-sm text-gray-500">CNPJ/CPF: {accountOwner.cpfCnpj}</p>}
                    {accountOwner?.phone && <p className="text-sm text-gray-500">Telefone: {accountOwner.phone}</p>}
                    {accountOwner?.email && <p className="text-sm text-gray-500">Email: {accountOwner.email}</p>}
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-semibold">Orçamento #{quote.id.substring(0, 6).toUpperCase()} (v{quote.version || 1})</h2>
                    <p className="text-sm text-gray-500">Data: {format(quote.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
            </header>

            <main className="my-8">
                <section className="mb-8 p-4 border rounded-lg">
                     <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Para</h3>
                     <p className="font-bold text-lg">{quote.clientName}</p>
                     {customer.phone && <p className="text-sm text-gray-600">Telefone: {customer.phone}</p>}
                     {customer.email && <p className="text-sm text-gray-600">Email: {customer.email}</p>}
                     {customer.address && <p className="text-sm text-gray-600">Endereço: {customer.address}</p>}
                </section>

                <section className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Título</h3>
                        <p className="font-medium">{quote.title}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Validade da Proposta</h3>
                        <p className="font-medium">{format(quote.validUntil.toDate(), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                </section>

                <section>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b">Descrição dos Itens / Serviços</h3>
                    <div className="bg-gray-50 p-4 rounded-md mt-2">
                        <p className="whitespace-pre-wrap text-sm">{quote.description}</p>
                    </div>
                </section>
                
                 {settings.quoteCustomFields && quote.customFields && Object.values(quote.customFields).some(v => v) && (
                    <section className="mt-8">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-2 border-b">Informações Adicionais</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                            {settings.quoteCustomFields
                                .filter(field => quote.customFields && quote.customFields[field.id])
                                .map(field => {
                                    const value = quote.customFields![field.id];
                                    if (!value) return null;
                                    
                                    const fieldType = field.type;
                                    let displayValue = value;
                                    if (fieldType === 'date' && value && typeof value === 'object' && 'seconds' in value) {
                                        displayValue = format((value as any).toDate(), 'dd/MM/yyyy');
                                    } else if (fieldType === 'currency' && typeof value === 'number') {
                                        displayValue = formatCurrency(value);
                                    }
                                    return (
                                        <div key={field.id} className="flex flex-col text-sm">
                                            <p className="font-medium">{field.name}:</p>
                                            <p className="text-gray-600">{String(displayValue)}</p>
                                        </div>
                                    );
                            })}
                        </div>
                    </section>
                )}
            </main>

            <footer className="pt-4 border-t-2 border-gray-200">
                <div className="text-right">
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="text-3xl font-bold">{formatCurrency(quote.totalValue)}</p>
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
