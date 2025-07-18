'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, PlusCircle, LogOut } from 'lucide-react';
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

const WhatsAppPage = () => {
    const [status, setStatus] = useState<string>('Autenticando...');
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null); // Estado para o QR Code
    const [isQrExpired, setIsQrExpired] = useState(false);
    const [countdown, setCountdown] = useState(20);
    const [isDisconnected, setIsDisconnected] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [chats, setChats] = useState<Record<string, Chat>>({});
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState(''); // Estado para o input de mensagem
    const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
    const [newChatNumber, setNewChatNumber] = useState('');
    const [newChatError, setNewChatError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    // Carrega os chats iniciais da API
    useEffect(() => {
        const fetchInitialChats = async () => {
            if (!user) return;

            try {
                const token = await user.getIdToken();
                const response = await fetch('/api/whatsapp/chats', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Falha ao buscar as conversas.');
                }

                const initialChats = await response.json();
                setChats(initialChats);
            } catch (error) {
                console.error("Erro ao carregar chats iniciais:", error);
                setStatus('Erro ao carregar suas conversas.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialChats();
    }, [user]);

    // Efeito para o contador regressivo do QR Code
    useEffect(() => {
        if (qrCodeUrl && !isQrExpired) {
            const countdownInterval = setInterval(() => {
                setCountdown(prev => prev > 0 ? prev - 1 : 0);
            }, 1000);

            const expiryTimeout = setTimeout(() => {
                setIsQrExpired(true);
                setQrCodeUrl(null); // Opcional: limpa o QR antigo da tela
            }, 20000); // 20 segundos

            return () => {
                clearInterval(countdownInterval);
                clearTimeout(expiryTimeout);
            };
        }
    }, [qrCodeUrl, isQrExpired]);
    
    // Conecta ao WebSocket
    useEffect(() => {
        if (!user) {
            setStatus('Você precisa estar logado para conectar o WhatsApp.');
            return;
        }

        const backendUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:3001';
        const newSocket = io(backendUrl);
        setSocket(newSocket);

        newSocket.on('connect', async () => {
            setStatus('Conectado. Autenticando...');
            const token = await user.getIdToken();
            if (token) {
                newSocket.emit('auth', token);
                setStatus('Sessão autenticada. Aguardando conexão com WhatsApp...');
            }
        });

        newSocket.on('qr', (url: string) => {
            setStatus('QR Code recebido. Por favor, escaneie.');
            setQrCodeUrl(url);
            setIsQrExpired(false); // Reseta o estado de expiração
            setCountdown(20); // Reseta o contador
            setIsDisconnected(false);
        });
        newSocket.on('connected', () => {
            setStatus('Conectado ao WhatsApp!');
            setQrCodeUrl(null); // Limpa o QR code após a conexão
            setIsQrExpired(false);
            setIsDisconnected(false);
        });
        newSocket.on('disconnected', (message: string) => {
            setStatus(`Desconectado: ${message}`);
            setQrCodeUrl(null);
            setIsQrExpired(false);
            setChats({});
            setActiveChatId(null);
            setIsDisconnected(true);
        });
        newSocket.on('replaced', (message: string) => {
            setStatus(`Sessão substituída: ${message}`);
            setQrCodeUrl(null);
            setIsQrExpired(false);
            setIsDisconnected(false);
        });
        newSocket.on('auth_error', (message: string) => setStatus(`Erro de autenticação: ${message}`));

        newSocket.on('new_message', ({ contactId, message }: { contactId: string, message: Message }) => {
            setChats(prevChats => {
                const updatedChat = {
                    ...prevChats[contactId],
                    id: contactId,
                    name: prevChats[contactId]?.name || contactId,
                    messages: [...(prevChats[contactId]?.messages || []), message],
                    lastMessage: message.text,
                    lastMessageTimestamp: message.timestamp,
                    unreadCount: (prevChats[contactId]?.unreadCount || 0) + 1,
                };
                return { ...prevChats, [contactId]: updatedChat };
            });
        });

        newSocket.on('number_check_result', ({ valid, jid, number, error }) => {
            if (valid) {
                setChats(prev => {
                    if (prev[jid]) { // Se o chat já existe, apenas abre ele
                        return prev;
                    }
                    // Cria um novo chat se não existir
                    const newChat: Chat = {
                        id: jid,
                        name: number,
                        messages: [],
                        lastMessage: 'Chat iniciado.',
                        lastMessageTimestamp: new Date().toISOString(),
                        unreadCount: 0,
                    };
                    return { ...prev, [jid]: newChat };
                });
                setActiveChatId(jid);
                setIsNewChatDialogOpen(false);
                setNewChatNumber('');
                setNewChatError('');
            } else {
                setNewChatError(error);
            }
        });

        return () => { newSocket.disconnect(); };
    }, [user]);

    const handleSendMessage = () => {
        if (!socket || !activeChatId || !messageInput.trim()) {
            return;
        }

        const message: Message = {
            fromMe: true,
            text: messageInput,
            timestamp: new Date().toISOString(),
        };

        // Adiciona a mensagem à UI imediatamente
        setChats(prevChats => {
            const updatedChat = {
                ...prevChats[activeChatId],
                messages: [...(prevChats[activeChatId]?.messages || []), message],
                lastMessage: message.text,
                lastMessageTimestamp: message.timestamp,
            };
            return { ...prevChats, [activeChatId]: updatedChat };
        });

        // Envia a mensagem para o backend
        socket.emit('send_message', {
            contactId: activeChatId,
            content: messageInput,
        });

        setMessageInput(''); // Limpa o input
    };

    const handleNewChat = () => {
        if (socket && newChatNumber.trim()) {
            setNewChatError('');
            socket.emit('check_number', { phoneNumber: newChatNumber });
        }
    };
    
    const activeChat = activeChatId ? chats[activeChatId] : null;

    const handleChatClick = (chatId: string) => {
        setActiveChatId(chatId);
        // Zera o contador de não lidas ao abrir o chat
        setChats(prev => {
            if (prev[chatId]?.unreadCount > 0) {
                return { ...prev, [chatId]: { ...prev[chatId], unreadCount: 0 } };
            }
            return prev;
        });
    };

    const handleLogout = () => {
        if (socket) {
            socket.emit('logout_session');
        }
    };

    const handleRequestNewQr = () => {
        if (socket) {
            setStatus('Solicitando novo QR Code...');
            socket.emit('request_new_qr');
        }
    };

    if (qrCodeUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
                    <h2 className="text-2xl font-bold mb-2">Conecte seu WhatsApp</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{status}</p>
                    <div className="relative w-64 h-64 mx-auto">
                        <Image src={qrCodeUrl} alt="QR Code do WhatsApp" width={256} height={256} />
                    </div>
                    <p className="mt-4 text-lg font-mono">Tempo restante: {countdown}s</p>
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        1. Abra o WhatsApp no seu celular. <br />
                        2. Toque em Menu ou Configurações e selecione <strong>Aparelhos conectados</strong>. <br />
                        3. Aponte seu celular para esta tela para capturar o código.
                    </p>
                </div>
            </div>
        );
    }

    if (isQrExpired) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
                    <h2 className="text-2xl font-bold mb-2">Tempo Esgotado</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        O QR Code expirou. Por favor, tente novamente.
                    </p>
                    <Button onClick={handleRequestNewQr}>
                        Gerar Novo QR Code
                    </Button>
                </div>
            </div>
        );
    }

    if (isDisconnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
                    <h2 className="text-2xl font-bold mb-2">Sessão Encerrada</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{status}</p>
                    <Button onClick={handleRequestNewQr}>
                        Conectar Novamente
                    </Button>
                </div>
            </div>
        );
    }
    

    return (
        <div className="h-full w-full flex flex-col">
            {/* Barra de Status */}
            <div className="p-2 bg-blue-500 text-white text-center text-sm flex justify-center items-center">
                <span className="flex-1">Status: {status}</span>
                {status === 'Conectado ao WhatsApp!' && (
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-none ml-4">
                        <LogOut className="h-4 w-4 mr-2" />
                        Encerrar Sessão
                    </Button>
                )}
            </div>
            
            <div className="flex flex-1 overflow-hidden">
                {/* Lista de Chats */}
                <aside className="w-1/3 border-r overflow-y-auto">
                    {/* Header da Lista de Chats */}
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Conversas</h2>
                        <Button variant="ghost" size="icon" onClick={() => setIsNewChatDialogOpen(true)}>
                            <PlusCircle className="h-6 w-6" />
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="p-4">Carregando conversas...</div>
                    ) : (
                        <Tabs defaultValue="all">
                            <TabsList className="w-full">
                                <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
                                <TabsTrigger value="unread" className="flex-1">Não Lidas</TabsTrigger>
                            </TabsList>

                            <TabsContent value="all">
                                {Object.values(chats).map((chat) => (
                                    <div key={chat.id} 
                                         onClick={() => handleChatClick(chat.id)}
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
                            </TabsContent>
                            <TabsContent value="unread">
                                {Object.values(chats).filter(c => c.unreadCount > 0).map((chat) => (
                                    <div key={chat.id} 
                                         onClick={() => handleChatClick(chat.id)}
                                         className={`p-4 cursor-pointer hover:bg-gray-100 ${activeChatId === chat.id ? 'bg-gray-200' : ''}`}>
                                        <div className="flex items-center">
                                            <Avatar className="mr-4">
                                                <AvatarImage src={`https://ui-avatars.com/api/?name=${chat.name}&background=random`} />
                                                <AvatarFallback>{chat.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <h3 className="font-semibold">{chat.name}</h3>
                                                    <span className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                        {chat.unreadCount}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>
                    )}
                </aside>
                
                {/* Janela de Chat Ativa */}
                <main className="flex-1 flex flex-col">
                    {activeChat ? (
                        <>
                            {/* Header do Chat */}
                            <header className="p-4 border-b flex items-center">
                                <Avatar className="mr-4">
                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${activeChat.name}&background=random`} />
                                    <AvatarFallback>{activeChat.name[0]}</AvatarFallback>
                                </Avatar>
                                <h2 className="text-xl font-semibold">{activeChat.name}</h2>
                            </header>

                            {/* Mensagens */}
                            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                                {activeChat.messages.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                        <div className={`rounded-lg px-4 py-2 max-w-lg ${msg.fromMe ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                                            <p>{msg.text}</p>
                                            <span className="text-xs text-right opacity-70 block mt-1">
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input de Mensagem */}
                            <footer className="p-4 border-t">
                                <div className="flex items-center">
                                    <Input
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Digite sua mensagem..."
                                        className="flex-1 mr-4"
                                    />
                                    <Button onClick={handleSendMessage}>
                                        <Send className="h-5 w-5" />
                                    </Button>
                                </div>
                            </footer>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <h2 className="text-2xl font-semibold">Selecione uma conversa</h2>
                                <p className="text-gray-500">Ou inicie uma nova para começar a conversar.</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Dialog para Novo Chat */}
            <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Iniciar Nova Conversa</DialogTitle>
                        <DialogDescription>
                            Digite o número de telefone do WhatsApp (incluindo o código do país).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            id="phoneNumber"
                            value={newChatNumber}
                            onChange={(e) => setNewChatNumber(e.target.value)}
                            placeholder="Ex: 5511999998888"
                        />
                        {newChatError && (
                            <p className="text-sm text-red-500">{newChatError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleNewChat}>Verificar e Iniciar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WhatsAppPage;
