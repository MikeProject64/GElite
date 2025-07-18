'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface NewChatDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    newChatNumber: string;
    onNewChatNumberChange: (value: string) => void;
    onConfirmNewChat: () => void;
    error: string;
}

export const NewChatDialog = ({
    isOpen,
    onOpenChange,
    newChatNumber,
    onNewChatNumberChange,
    onConfirmNewChat,
    error,
}: NewChatDialogProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Iniciar Nova Conversa</DialogTitle>
                    <DialogDescription>
                        Digite o número de telefone completo com código do país (ex: 5511999998888).
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        placeholder="5511999998888"
                        value={newChatNumber}
                        onChange={(e) => onNewChatNumberChange(e.target.value)}
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={onConfirmNewChat}>Verificar e Abrir</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 