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
}

export function CreateQuoteModal({ isOpen, onOpenChange, clientId, template }: CreateQuoteModalProps) {
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
                    <DialogTitle>Criar Novo Orçamento</DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes abaixo para criar uma nova proposta rapidamente.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh] p-4">
                    <QuoteForm onSuccess={handleSuccess} clientId={clientId} template={template} />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
