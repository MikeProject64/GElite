'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, FilePlus } from 'lucide-react';
import { CreateServiceOrderForm } from '@/components/create-service-order-form';

function CreateServiceOrderTitle() {
    const searchParams = useSearchParams();
    const isVersioning = !!searchParams.get('versionOf');
    return <>{isVersioning ? 'Criar Nova Versão da OS' : 'Criar Nova Ordem de Serviço'}</>;
}

export default function CriarServicoPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/dashboard/servicos">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Voltar</span>
                        </Link>
                    </Button>
                    <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold flex items-center gap-2">
                        <FilePlus className='h-5 w-5' />
                        <CreateServiceOrderTitle />
                    </h1>
                </div>
                <CreateServiceOrderForm />
            </div>
        </Suspense>
    )
} 