
'use client';

import { useState } from 'react';
import { useSettings } from '@/components/settings-provider';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99 0-3.903-.52-5.586-1.456l-6.162 1.688a.5.5 0 0 1-.61-.611zM7.51 18.045l.334.19c1.551.884 3.298 1.349 5.065 1.349 5.454 0 9.902-4.448 9.902-9.902s-4.448-9.902-9.902-9.902-9.902 4.448-9.902 9.902c0 1.82.494 3.564 1.378 5.083l.228.423-1.021 3.731 3.829-1.046z"/>
        <path d="M12.071 11.33c-.22-.112-1.328-.655-1.533-.73-.205-.075-.354-.112-.504.112s-.58.729-.711.879-.262.168-.486.056c-.224-.112-.94-1.12-1.793-1.793-.665-.525-1.12-1.175-1.232-1.372-.112-.197-.015-.312.1-.424.113-.112.251-.297.377-.447.126-.15.168-.251.252-.423.084-.173.042-.313-.014-.424-.057-.112-.505-1.217-.692-1.666-.187-.45-.375-.39-.525-.397h-.252c-.187 0-.468.056-.711.325-.244.27-.935.914-.935 2.203 0 1.288.959 2.571 1.092 2.742.133.17 1.815 2.811 4.394 3.829.61.264 1.12.424 1.52.547.4.123.765.104 1.06.06.342-.047 1.328-.542 1.514-1.066.187-.525.187-.973.131-1.066-.056-.094-.187-.15-.392-.262z"/>
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
        <div className="fixed bottom-6 right-6 z-50 group">
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
