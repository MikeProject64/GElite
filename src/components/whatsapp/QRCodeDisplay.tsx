import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface QRCodeDisplayProps {
    session: {
        id: string;
        name: string;
        qrCodeUrl?: string;
        isQrExpired?: boolean;
        qrCountdown?: number;
    };
    onRequestNewQr: (sessionId: string) => void;
}

export function QRCodeDisplay({ session, onRequestNewQr }: QRCodeDisplayProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-8 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
                <h2 className="text-2xl font-bold mb-2">Conecte: {session.name}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Escaneie o QR Code</p>
                {session.qrCodeUrl && !session.isQrExpired ? (
                    <>
                        <div className="relative w-64 h-64 mx-auto">
                            <Image src={session.qrCodeUrl} alt="QR Code" width={256} height={256} />
                        </div>
                        <p className="mt-4 text-lg font-mono">Tempo: {session.qrCountdown}s</p>
                    </>
                ) : (
                    <div>
                        <p>QR Code expirado.</p>
                        <Button onClick={() => onRequestNewQr(session.id)}>Gerar Novo</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
