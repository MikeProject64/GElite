export interface Message {
    fromMe: boolean;
    text: string;
    timestamp: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string;
    fileName?: string;
    id: string; 
    chatId: string;
    senderName?: string;
}

export interface Chat {
    id: string;
    name: string;
    unreadCount: number;
    lastMessage: string;
    lastMessageTimestamp: string;
    messages: Message[];
}

export interface Session {
    id: string; 
    status: string; 
    qrCodeUrl?: string;
}

export interface QrModalData {
    sessionId: string;
    qrCodeUrl: string;
} 