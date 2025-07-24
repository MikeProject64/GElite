'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QuoteForm } from './forms/quote-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import type { Quote } from '@/types';

interface CreateQuoteModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    clientId?: string;
    template?: Quote | null;
    baseQuoteId?: string; // Adicionado para suportar versionamento
}

export function CreateQuoteModal({ isOpen, onOpenChange, clientId, template, baseQuoteId }: CreateQuoteModalProps) {
    const router = useRouter();

    const handleSuccess = (quoteId: string) => {
        onOpenChange(false);
        router.push(`/dashboard/orcamentos/${quoteId}`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-w-4xl"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{baseQuoteId ? 'Criar Nova Versão do Orçamento' : 'Criar Novo Orçamento'}</DialogTitle>
                    <DialogDescription>
                        {baseQuoteId ? 'Altere os detalhes para criar uma nova versão. A versão anterior será mantida.' : 'Preencha os detalhes abaixo para criar uma nova proposta rapidamente.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh] p-4">
                    <QuoteForm onSuccess={handleSuccess} clientId={clientId} template={template} baseQuoteId={baseQuoteId} />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
