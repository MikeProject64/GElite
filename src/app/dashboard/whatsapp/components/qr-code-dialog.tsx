'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrModalData } from "../types";

interface QrCodeDialogProps {
    qrData: QrModalData | null;
    countdown: number;
    onOpenChange: (isOpen: boolean) => void;
}

export const QrCodeDialog = ({ qrData, countdown, onOpenChange }: QrCodeDialogProps) => {
    return (
        <Dialog open={!!qrData} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Conectar Nova Sessão</DialogTitle>
                    <DialogDescription>
                        Escaneie o QR Code com o seu celular.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                    {qrData?.qrCodeUrl && (
                        <img src={qrData.qrCodeUrl} alt="QR Code do WhatsApp" className="w-64 h-64 border rounded-lg" />
                    )}
                    <p className="mt-4 text-lg font-mono">
                        Tempo restante: <span className="font-bold">{countdown}s</span>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 