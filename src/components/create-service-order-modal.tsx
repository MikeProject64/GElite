'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreateServiceOrderForm } from './create-service-order-form';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CreateServiceOrderModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function CreateServiceOrderModal({ isOpen, onOpenChange }: CreateServiceOrderModalProps) {
    const handleClose = () => onOpenChange(false);
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-w-4xl"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Criar Nova Ordem de Serviço</DialogTitle>
                    <DialogDescription>
                        Preencha os detalhes abaixo para criar uma nova ordem de serviço rapidamente.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh] p-4">
                    <CreateServiceOrderForm isModal={true} onFormSubmit={handleClose} />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
} 