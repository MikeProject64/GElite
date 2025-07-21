'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, PlusCircle, LogOut, Trash2, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

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
    name: string; // Ex: "Celular Principal", "Celular de Vendas"
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

    // Carrega sessões iniciais da API
    useEffect(() => {
        const fetchInitialSessions = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const response = await fetch('/api/whatsapp/sessions', { // Rota a ser criada no Next.js
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Falha ao buscar sessões.');
                const initialSessions: WhatsAppSession[] = await response.json();

                const sessionsMap: Record<string, WhatsAppSession> = {};
                initialSessions.forEach(session => {
                    sessionsMap[session.id] = { ...session, chats: {} }; // Chats serão carregados sob demanda ou via WS
                });
                setSessions(sessionsMap);
                if (initialSessions.length > 0) {
                    setActiveSessionId(initialSessions[0].id);
                }
            } catch (error) {
                console.error("Erro ao carregar sessões:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialSessions();
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
                // Inicia todas as sessões existentes
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

        // Adiciona na UI otimistamente
        setSessions(prev => ({ ...prev, [sessionId]: newSession }));

        // Salva no backend (rota a ser criada)
        const token = await user.getIdToken();
        await fetch('/api/whatsapp/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: sessionId, name: newSessionName }),
        });

        // Inicia a sessão no backend
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
    
    const handleLogoutSession = (sessionId: string) => {
        socket?.emit('logout_session', { sessionId });
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
                                <Button onClick={() => handleRequestNewQr(session.id)}>Gerar Novo</Button>
                            </div>
                        )}
                    </div>
                </div>
            );
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

        // Conteúdo principal do chat para uma sessão conectada
        return (
             <div className="flex flex-1 overflow-hidden">
                <aside className="w-1/3 border-r overflow-y-auto">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Conversas</h2>
                        <Button variant="ghost" size="icon" onClick={() => setIsNewChatDialogOpen(true)}>
                            <PlusCircle className="h-6 w-6" />
                        </Button>
                    </div>
                    {Object.values(session.chats).map((chat) => (
                        <div key={chat.id}
                             onClick={() => setActiveChatId(chat.id)}
                             className={`p-4 cursor-pointer hover:bg-gray-100 ${activeChatId === chat.id ? 'bg-gray-200' : ''}`}>
                             <div className="flex items-center">
                                 <Avatar className="mr-4">
                                     <AvatarImage src={`https://ui-avatars.com/api/?name=${chat.name}&background=random`} />
                                     <AvatarFallback>{chat.name[0]}</AvatarFallback>
                                 </Avatar>
                                 <div className="flex-1">
                                     <div className="flex justify-between">
                                         <h3 className="font-semibold">{chat.name}</h3>
                                         {chat.unreadCount > 0 && (
                                             <span className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                 {chat.unreadCount}
                                             </span>
                                         )}
                                     </div>
                                     <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                                 </div>
                             </div>
                        </div>
                    ))}
                </aside>
                
                <main className="flex-1 flex flex-col">
                    {activeChat ? (
                        <>
                            <header className="p-4 border-b flex items-center">
                                 <Avatar className="mr-4">
                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${activeChat.name}&background=random`} />
                                    <AvatarFallback>{activeChat.name[0]}</AvatarFallback>
                                </Avatar>
                                <h2 className="text-xl font-semibold">{activeChat.name}</h2>
                            </header>
                            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                                {activeChat.messages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                        <div className={`rounded-lg px-4 py-2 max-w-lg ${msg.fromMe ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                                            <p>{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <footer className="p-4 border-t">
                                <div className="flex items-center">
                                    <Input
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Digite sua mensagem..."
                                        className="flex-1 mr-4"
                                    />
                                    <Button onClick={handleSendMessage}><Send className="h-5 w-5" /></Button>
                                </div>
                            </footer>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p>Selecione uma conversa.</p>
                        </div>
                    )}
                </main>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex">
            {/* Barra Lateral de Sessões */}
            <aside className="w-1/4 bg-gray-100 dark:bg-gray-800 p-4 border-r">
                <h1 className="text-2xl font-bold mb-4">Sessões</h1>
                <Button className="w-full mb-4" onClick={() => setIsNewSessionDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Sessão
                </Button>
                <div className="space-y-2">
                    {Object.values(sessions).map(session => (
                        <div key={session.id}
                             onClick={() => setActiveSessionId(session.id)}
                             className={`p-3 rounded-lg cursor-pointer ${activeSessionId === session.id ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">{session.name}</span>
                                <span className={`h-3 w-3 rounded-full ${session.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>
                            <p className="text-sm opacity-70">{session.status}</p>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 flex flex-col">
                {activeSession ? renderSessionContent(activeSession) : (
                    <div className="flex items-center justify-center h-full">
                        <p>Selecione ou crie uma sessão para começar.</p>
                    </div>
                )}
            </main>

            {/* Dialog para Nova Sessão */}
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

            {/* Dialog para Novo Chat (pode ser necessário ajustar o estado que o controla) */}
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
