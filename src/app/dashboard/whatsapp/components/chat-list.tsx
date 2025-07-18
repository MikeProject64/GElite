'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chat } from "../types";
import { PlusCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatListProps {
    chats: Record<string, Chat>;
    activeChatId: string | null;
    status: string;
    isLoading: boolean;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
}

export const ChatList = ({
    chats,
    activeChatId,
    status,
    isLoading,
    onChatSelect,
    onNewChat,
    onDeleteChat
}: ChatListProps) => {
    return (
        <div className="w-full md:w-1/3 flex flex-col border-r">
            <div className="p-4 border-b shrink-0">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Conversas</h2>
                    <Button variant="ghost" size="icon" onClick={onNewChat}>
                        <PlusCircle className="h-6 w-6" />
                    </Button>
                </div>
                <p className="text-sm text-gray-500 truncate">{status}</p>
            </div>
            <div className="flex-grow overflow-y-auto">
                {isLoading ? (
                    <div className="p-3 space-y-4">
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-4 w-[150px]" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-4 w-[150px]" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[200px]" />
                                <Skeleton className="h-4 w-[150px]" />
                            </div>
                        </div>
                    </div>
                ) : (
                    Object.values(chats).sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()).map((chat) => (
                        <div
                            key={chat.id}
                            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${activeChatId === chat.id ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                            onClick={() => onChatSelect(chat.id)}
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
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Impede que o clique selecione o chat
                                    onDeleteChat(chat.id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 rounded-full"
                                aria-label="Deletar conversa"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 