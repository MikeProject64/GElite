'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { SessionList } from '@/components/whatsapp/SessionList';
import { ChatWindow } from '@/components/whatsapp/ChatWindow';
import { QRCodeDisplay } from '@/components/whatsapp/QRCodeDisplay';

// Tipos
interface Message {
    fromMe: boolean;
    text: string;
    timestamp: string;
}

interface Chat {
    id: string;
    name: string;
    unreadCount: number;
    lastMessage: string;
    lastMessageTimestamp: string;
    messages: Message[];
}

interface WhatsAppSession {
    id: string;
    name: string;
    status: 'disconnected' | 'connected' | 'connecting' | 'qr' | 'error' | 'replaced';
    qrCodeUrl?: string;
    qrCountdown?: number;
    isQrExpired?: boolean;
    chats: Record<string, Chat>;
}

const WhatsAppPage = () => {
    const [sessions, setSessions] = useState<Record<string, WhatsAppSession>>({});
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
    const [newChatNumber, setNewChatNumber] = useState('');
    const [newChatError, setNewChatError] = useState('');
    const [isNewSessionDialogOpen, setIsNewSessionDialogOpen] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    // Carrega sessões e chats iniciais
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const token = await user.getIdToken();
                const response = await fetch('/api/whatsapp/sessions', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Falha ao buscar sessões.');
                const initialSessions: WhatsAppSession[] = await response.json();

                const sessionsMap: Record<string, WhatsAppSession> = {};
                for (const session of initialSessions) {
                    const chatsResponse = await fetch(`/api/whatsapp/sessions/${session.id}/chats`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const chats = await chatsResponse.json();
                    sessionsMap[session.id] = { ...session, chats };
                }

                setSessions(sessionsMap);
                if (initialSessions.length > 0) {
                    setActiveSessionId(initialSessions[0].id);
                }
            } catch (error) {
                console.error("Erro ao carregar dados iniciais:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [user]);

    // Conecta ao WebSocket e gerencia eventos
    useEffect(() => {
        if (!user) return;

        const connectSocket = async () => {
            const token = await user.getIdToken();
            const backendUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:8000';
            const newSocket = io(backendUrl, {
                auth: { token },
                transports: ['websocket'],
            });
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('Socket.IO conectado.');
                Object.keys(sessions).forEach(sessionId => {
                    newSocket.emit('startSession', { sessionId });
                });
            });

            newSocket.on('qr', ({ sessionId, qrCodeUrl }) => {
                setSessions(prev => ({
                    ...prev,
                    [sessionId]: {
                        ...prev[sessionId],
                        status: 'qr',
                        qrCodeUrl,
                        isQrExpired: false,
                        qrCountdown: 20,
                    },
                }));
            });

            newSocket.on('connected', ({ sessionId }) => {
                setSessions(prev => ({
                    ...prev,
                    [sessionId]: { ...prev[sessionId], status: 'connected', qrCodeUrl: undefined },
                }));
            });

            newSocket.on('disconnected', ({ sessionId, message }) => {
                setSessions(prev => ({
                    ...prev,
                    [sessionId]: { ...prev[sessionId], status: 'disconnected', chats: {} },
                }));
            });

            newSocket.on('replaced', ({ sessionId, message }) => {
                setSessions(prev => ({
                    ...prev,
                    [sessionId]: { ...prev[sessionId], status: 'replaced' },
                }));
            });

            newSocket.on('new_message', ({ sessionId, contactId, message }) => {
                setSessions(prev => {
                    const targetSession = prev[sessionId];
                    if (!targetSession) return prev;
                    const updatedChat = {
                        ...targetSession.chats[contactId],
                        id: contactId,
                        name: targetSession.chats[contactId]?.name || contactId,
                        messages: [...(targetSession.chats[contactId]?.messages || []), message],
                        lastMessage: message.text,
                        lastMessageTimestamp: message.timestamp,
                        unreadCount: (targetSession.chats[contactId]?.unreadCount || 0) + 1,
                    };
                    return {
                        ...prev,
                        [sessionId]: {
                            ...targetSession,
                            chats: { ...targetSession.chats, [contactId]: updatedChat },
                        },
                    };
                });
            });

            newSocket.on('number_check_result', ({ sessionId, valid, jid, number, error }) => {
                if (valid) {
                    setSessions(prev => {
                        const targetSession = prev[sessionId];
                        if (!targetSession || targetSession.chats[jid]) return prev;
                        const newChat: Chat = {
                            id: jid, name: number, messages: [],
                            lastMessage: 'Chat iniciado.',
                            lastMessageTimestamp: new Date().toISOString(),
                            unreadCount: 0,
                        };
                        return {
                            ...prev,
                            [sessionId]: {
                                ...targetSession,
                                chats: { ...targetSession.chats, [jid]: newChat },
                            },
                        };
                    });
                    setActiveChatId(jid);
                    setIsNewChatDialogOpen(false);
                    setNewChatNumber('');
                    setNewChatError('');
                } else {
                    setNewChatError(error);
                }
            });

        };

        connectSocket();

        return () => {
            socket?.disconnect();
        };
    }, [user, sessions]);

    // Efeito para contagem regressiva do QR Code
    useEffect(() => {
        const interval = setInterval(() => {
            setSessions(prev => {
                const newSessions = { ...prev };
                let changed = false;
                Object.keys(newSessions).forEach(sid => {
                    const s = newSessions[sid];
                    if (s.status === 'qr' && s.qrCountdown && s.qrCountdown > 0) {
                        newSessions[sid] = { ...s, qrCountdown: s.qrCountdown - 1 };
                        changed = true;
                    } else if (s.status === 'qr' && s.qrCountdown === 0 && !s.isQrExpired) {
                        newSessions[sid] = { ...s, isQrExpired: true };
                        changed = true;
                    }
                });
                return changed ? newSessions : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleAddNewSession = async () => {
        if (!user || !newSessionName.trim()) return;
        const sessionId = uuidv4();
        const newSession: WhatsAppSession = {
            id: sessionId,
            name: newSessionName,
            status: 'connecting',
            chats: {},
        };

        setSessions(prev => ({ ...prev, [sessionId]: newSession }));

        const token = await user.getIdToken();
        await fetch('/api/whatsapp/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: sessionId, name: newSessionName }),
        });

        socket?.emit('startSession', { sessionId });
        setActiveSessionId(sessionId);
        setIsNewSessionDialogOpen(false);
        setNewSessionName('');
    };

    const handleSendMessage = () => {
        if (!socket || !activeSessionId || !activeChatId || !messageInput.trim()) return;
        const message: Message = {
            fromMe: true,
            text: messageInput,
            timestamp: new Date().toISOString(),
        };

        setSessions(prev => {
            const newSessions = { ...prev };
            const session = newSessions[activeSessionId];
            if (!session) return prev;
            const chat = session.chats[activeChatId];
            if (!chat) return prev;
            const updatedChat = {
                ...chat,
                messages: [...chat.messages, message],
                lastMessage: message.text,
                lastMessageTimestamp: message.timestamp,
            };
            session.chats[activeChatId] = updatedChat;
            return newSessions;
        });

        socket.emit('send_message', {
            sessionId: activeSessionId,
            contactId: activeChatId,
            content: messageInput,
        });
        setMessageInput('');
    };

    const handleNewChat = () => {
        if (socket && activeSessionId && newChatNumber.trim()) {
            setNewChatError('');
            socket.emit('check_number', { sessionId: activeSessionId, phoneNumber: newChatNumber });
        }
    };
    
    const handleRequestNewQr = (sessionId: string) => {
        socket?.emit('request_new_qr', { sessionId });
    };

    const activeSession = activeSessionId ? sessions[activeSessionId] : null;
    const activeChat = activeSession && activeChatId ? activeSession.chats[activeChatId] : null;

    if (isLoading) {
        return <div>Carregando...</div>;
    }

    const renderSessionContent = (session: WhatsAppSession) => {
        if (session.status === 'qr') {
            return <QRCodeDisplay session={session} onRequestNewQr={handleRequestNewQr} />;
        }

        if (session.status === 'disconnected' || session.status === 'error' || session.status === 'replaced') {
             return (
                <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
                    <div className="text-center p-8 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
                        <h2 className="text-2xl font-bold mb-2">Sessão {session.name} Encerrada</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            {session.status === 'replaced' ? 'Sessão substituída.' : 'A sessão foi desconectada.'}
                        </p>
                        <Button onClick={() => handleRequestNewQr(session.id)}>
                            Conectar Novamente
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <ChatWindow
                session={session}
                activeChat={activeChat}
                activeChatId={activeChatId}
                onChatClick={setActiveChatId}
                onNewChatClick={() => setIsNewChatDialogOpen(true)}
                messageInput={messageInput}
                onMessageInputChange={setMessageInput}
                onSendMessage={handleSendMessage}
            />
        );
    };

    return (
        <div className="h-full w-full flex">
            <SessionList
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSessionClick={setActiveSessionId}
                onNewSessionClick={() => setIsNewSessionDialogOpen(true)}
            />

            <main className="flex-1 flex flex-col">
                {activeSession ? renderSessionContent(activeSession) : (
                    <div className="flex items-center justify-center h-full">
                        <p>Selecione ou crie uma sessão para começar.</p>
                    </div>
                )}
            </main>

            <Dialog open={isNewSessionDialogOpen} onOpenChange={setIsNewSessionDialogOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adicionar Nova Sessão</DialogTitle>
                        <DialogDescription>
                            Dê um nome para sua nova conexão do WhatsApp.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        placeholder="Ex: Celular de Vendas"
                    />
                    <DialogFooter>
                        <Button onClick={handleAddNewSession}>Adicionar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Iniciar Nova Conversa</DialogTitle>
                    </DialogHeader>
                     <Input
                        value={newChatNumber}
                        onChange={(e) => setNewChatNumber(e.target.value)}
                        placeholder="Ex: 5511999998888"
                    />
                    {newChatError && <p className="text-sm text-red-500">{newChatError}</p>}
                    <DialogFooter>
                        <Button onClick={handleNewChat}>Verificar e Iniciar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WhatsAppPage;
