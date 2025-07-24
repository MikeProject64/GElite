'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ContractForm } from './forms/contract-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ServiceAgreement } from '@/types';

interface CreateContractModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    agreement?: ServiceAgreement | null;
}

export function CreateContractModal({ isOpen, onOpenChange, agreement }: CreateContractModalProps) {
    const handleSuccess = () => {
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent 
                className="sm:max-w-lg"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{agreement ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
                    <DialogDescription>
                        Configure um contrato para gerar Ordens de Serviço automaticamente na frequência desejada.
                    </DialogDescription>
                </DialogHeader>
                <ContractForm onSuccess={handleSuccess} agreement={agreement} />
            </DialogContent>
        </Dialog>
    );
} 