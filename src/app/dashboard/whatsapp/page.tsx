'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, PlusCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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

        newSocket.on('qr', () => setStatus('QR Code recebido. Por favor, escaneie.'));
        newSocket.on('connected', () => setStatus('Conectado ao WhatsApp!'));
        newSocket.on('disconnected', (message: string) => setStatus(`Desconectado: ${message}`));
        newSocket.on('replaced', (message: string) => setStatus(`Sessão substituída: ${message}`));
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

    return (
        <div className="h-full w-full flex flex-col">
            <Tabs defaultValue="whatsapp" className="flex flex-col flex-grow p-4 md:p-6">
                <TabsList className="mb-4 shrink-0">
                    <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                    <TabsTrigger value="clientes" disabled>Clientes</TabsTrigger>
                    <TabsTrigger value="configuracoes" disabled>Configurações</TabsTrigger>
                </TabsList>
                
                <TabsContent value="whatsapp" className="flex-grow overflow-hidden">
                    <div className="flex h-full border rounded-lg overflow-hidden">
                        {/* Coluna da Esquerda: Lista de Chats */}
                        <div className="w-full md:w-1/3 flex flex-col border-r">
                            <div className="p-4 border-b shrink-0">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold">Conversas</h2>
                                    <Button variant="ghost" size="icon" onClick={() => setIsNewChatDialogOpen(true)}>
                                        <PlusCircle className="h-6 w-6" />
                                    </Button>
                                </div>
                                <p className="text-sm text-gray-500 truncate">{status}</p>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                                {isLoading ? (
                                    <p className="p-4 text-center text-gray-500">Carregando...</p>
                                ) : (
                                    Object.values(chats).sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()).map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${activeChatId === chat.id ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                                            onClick={() => handleChatClick(chat.id)}
                                        >
                                            <div className="flex items-center">
                                                <Avatar className="mr-4">
                                                    <AvatarImage src={`https://ui-avatars.com/api/?name=${chat.name.replace(' ', '+')}`} />
                                                    <AvatarFallback>{chat.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-grow">
                                                    <h3 className="font-semibold">{chat.name}</h3>
                                                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                                                </div>
                                                {chat.unreadCount > 0 && (
                                                    <div className="bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                                        {chat.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Coluna da Direita: Chat Ativo */}
                        <div className="hidden md:flex w-2/3 flex-col">
                            {activeChat ? (
                                <>
                                    <div className="p-4 border-b flex items-center shrink-0">
                                        <Avatar className="mr-4">
                                            <AvatarImage src={`https://ui-avatars.com/api/?name=${activeChat.name.replace(' ', '+')}`} />
                                            <AvatarFallback>{activeChat.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <h2 className="text-xl font-bold">{activeChat.name}</h2>
                                    </div>
                                    <div className="flex-grow p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                                        {activeChat.messages.map((msg, index) => (
                                            <div key={index} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                                <div className={`rounded-lg p-3 max-w-lg ${msg.fromMe ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                                                    <p>{msg.text}</p>
                                                    <p className="text-xs text-right mt-1 opacity-75">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 border-t bg-white shrink-0">
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }}
                                            className="flex items-center"
                                        >
                                            <Input
                                                placeholder="Digite uma mensagem..."
                                                className="flex-grow"
                                                value={messageInput}
                                                onChange={(e) => setMessageInput(e.target.value)}
                                            />
                                            <Button type="submit" className="ml-4">
                                                <Send size={20} />
                                            </Button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-grow flex items-center justify-center">
                                    <p className="text-gray-500">Selecione uma conversa para começar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Iniciar Nova Conversa</DialogTitle>
                        <DialogDescription>
                            Digite o número de telefone completo com código do país (ex: 5511999998888).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="5511999998888"
                            value={newChatNumber}
                            onChange={(e) => setNewChatNumber(e.target.value)}
                        />
                        {newChatError && <p className="text-red-500 text-sm mt-2">{newChatError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewChatDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleNewChat}>Verificar e Abrir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WhatsAppPage; 