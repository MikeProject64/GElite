import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, PlusCircle } from 'lucide-react';

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

interface ChatWindowProps {
    session: { chats: Record<string, Chat> };
    activeChat: Chat | null;
    activeChatId: string | null;
    onChatClick: (chatId: string) => void;
    onNewChatClick: () => void;
    messageInput: string;
    onMessageInputChange: (value: string) => void;
    onSendMessage: () => void;
}

export function ChatWindow({
    session,
    activeChat,
    activeChatId,
    onChatClick,
    onNewChatClick,
    messageInput,
    onMessageInputChange,
    onSendMessage,
}: ChatWindowProps) {
    return (
        <div className="flex flex-1 overflow-hidden">
            <aside className="w-1/3 border-r overflow-y-auto">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Conversas</h2>
                    <Button variant="ghost" size="icon" onClick={onNewChatClick}>
                        <PlusCircle className="h-6 w-6" />
                    </Button>
                </div>
                {Object.values(session.chats).map((chat) => (
                    <div key={chat.id}
                         onClick={() => onChatClick(chat.id)}
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
                                    onChange={(e) => onMessageInputChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && onSendMessage()}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 mr-4"
                                />
                                <Button onClick={onSendMessage}><Send className="h-5 w-5" /></Button>
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
}
