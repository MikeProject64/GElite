'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chat } from "../types";
import { MessageBubble } from "./message-bubble";
import { Send } from "lucide-react";

interface ChatWindowProps {
    activeChat: Chat | null;
    messageInput: string;
    onMessageInputChange: (value: string) => void;
    onSendMessage: () => void;
}

export const ChatWindow = ({ activeChat, messageInput, onMessageInputChange, onSendMessage }: ChatWindowProps) => {
    if (!activeChat) {
        return (
            <div className="hidden md:flex w-2/3 flex-col items-center justify-center">
                <p className="text-gray-500">Selecione uma conversa para começar.</p>
            </div>
        );
    }

    return (
        <div className="hidden md:flex w-2/3 flex-col">
            <div className="p-4 border-b flex items-center shrink-0">
                <Avatar className="mr-4">
                    <AvatarImage src={`https://ui-avatars.com/api/?name=${activeChat.name.replace(' ', '+')}`} />
                    <AvatarFallback>{activeChat.name[0]}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{activeChat.name}</h2>
            </div>
            <div className="flex-grow p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                {activeChat.messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                ))}
            </div>
            <div className="p-4 border-t bg-white shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSendMessage();
                    }}
                    className="flex items-center"
                >
                    <Input
                        placeholder="Digite uma mensagem..."
                        className="flex-grow"
                        value={messageInput}
                        onChange={(e) => onMessageInputChange(e.target.value)}
                    />
                    <Button type="submit" className="ml-4">
                        <Send size={20} />
                    </Button>
                </form>
            </div>
        </div>
    );
}; 