
'use client';

import { useState } from 'react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
        <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 1.258.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
    </svg>
);

export function WhatsAppSupportButton() {
    const { settings } = useSettings();
    const [isVisible, setIsVisible] = useState(true);

    if (!settings.whatsappNumber || !isVisible) {
        return null;
    }

    const handleOpenWhatsApp = () => {
        const phone = settings.whatsappNumber!.replace(/\D/g, '');
        const message = encodeURIComponent(settings.whatsappMessage || 'Olá! Preciso de ajuda.');
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 group flex items-center gap-2">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full shadow text-sm font-semibold mr-2 hidden sm:block animate-fade-in">
                Suporte
            </div>
            <Button
                onClick={handleOpenWhatsApp}
                className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 shadow-lg text-white flex items-center justify-center"
            >
                <WhatsAppIcon />
            </Button>
            <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent the main button click
                    setIsVisible(false);
                }}
            >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar botão de suporte</span>
            </Button>
        </div>
    );
}
