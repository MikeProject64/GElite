'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth-provider';
import { Message, QrModalData, Session } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface UseWhatsappSocketProps {
    onNewMessage: (data: { sessionId: string; message: Message }) => void;
    // Futuramente, podemos adicionar outros callbacks aqui, como onChatUpdate, etc.
}


export const useWhatsappSocket = ({ onNewMessage }: UseWhatsappSocketProps) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [sessions, setSessions] = useState<Record<string, Session>>({});
    const [qrModalData, setQrModalData] = useState<QrModalData | null>(null);

    useEffect(() => {
        if (!user) return;

        const connectSocket = async () => {
            if (socket) return;

            const token = await user.getIdToken();
            const backendUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:3001';
            
            const newSocket = io(backendUrl, {
                auth: { token },
                autoConnect: true,
            });

            newSocket.on('qr', ({ sessionId, qrCodeUrl }: { sessionId: string, qrCodeUrl: string }) => {
                setSessions(prev => ({
                    ...prev,
                    [sessionId]: { ...prev[sessionId], status: 'QR Code Recebido', qrCodeUrl: '' }
                }));
                setQrModalData({ sessionId, qrCodeUrl });
            });
            
            newSocket.on('connected', ({ sessionId }: { sessionId: string }) => {
                setSessions(prev => ({
                    ...prev,
                    [sessionId]: { ...prev[sessionId], status: 'Conectado', qrCodeUrl: undefined }
                }));
                if (qrModalData?.sessionId === sessionId) {
                    setQrModalData(null);
                }
            });
            
            newSocket.on('disconnected', ({ sessionId }: { sessionId: string }) => {
                setSessions(prev => ({
                    ...prev,
                    [sessionId]: { ...prev[sessionId], status: 'Desconectado', qrCodeUrl: undefined }
                }));
            });

            newSocket.on('new_message', (data: { sessionId: string, message: Message }) => {
                onNewMessage(data);
            });

            setSocket(newSocket);
        };

        connectSocket();

        return () => {
            socket?.off('new_message');
            socket?.disconnect();
        };
    }, [user, socket, onNewMessage]);

    const handleAddSession = () => {
        if (!socket) return;
        const newSessionId = uuidv4();
        setSessions(prev => ({
            ...prev,
            [newSessionId]: { id: newSessionId, status: 'Iniciando...', qrCodeUrl: '' }
        }));
        socket.emit('startSession', { sessionId: newSessionId });
    };

    const handleSendMessage = (contactId: string, content: string) => {
        socket?.emit('send_message', { contactId, content });
    };

    const handleCheckNumber = (phoneNumber: string) => {
        socket?.emit('check_number', { phoneNumber });
    }

    return { 
        sessions, 
        qrModalData, 
        setQrModalData,
        handleAddSession,
        handleSendMessage,
        handleCheckNumber
    };
}; 