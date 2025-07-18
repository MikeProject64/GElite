'use client';

import { Download, Paperclip } from "lucide-react";
import { Message } from "../types";

// Novo componente para renderizar a bolha de mensagem
export const MessageBubble = ({ msg }: { msg: Message }) => {
    const renderContent = () => {
        switch (msg.type) {
            case 'image':
                return <img src={msg.mediaUrl} alt={msg.fileName} className="rounded-lg max-w-xs cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')} />;
            case 'video':
                return <video src={msg.mediaUrl} controls className="rounded-lg max-w-xs" />;
            case 'audio':
                return <audio src={msg.mediaUrl} controls />;
            case 'document':
                return (
                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center bg-gray-200 p-2 rounded-lg hover:bg-gray-300">
                        <Paperclip className="mr-2 h-5 w-5" />
                        <span>{msg.fileName || 'Documento'}</span>
                        <Download className="ml-auto h-5 w-5" />
                    </a>
                );
            default: // text
                return <p>{msg.text}</p>;
        }
    };

    return (
        <div className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`rounded-lg p-2 max-w-lg ${msg.fromMe ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                {msg.type !== 'text' && msg.text && <p className="mb-1">{msg.text}</p>}
                {renderContent()}
                <p className="text-xs text-right mt-1 opacity-75">{new Date(msg.timestamp).toLocaleTimeString()}</p>
            </div>
        </div>
    );
}; 