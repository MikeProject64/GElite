'use client';

import { Button } from "@/components/ui/button";
import { Session } from "../types";
import { PlusCircle } from "lucide-react";

interface SessionManagerProps {
    sessions: Record<string, Session>;
    onAddSession: () => void;
    onSessionSelect: (sessionId: string) => void;
}

export const SessionManager = ({ sessions, onAddSession, onSessionSelect }: SessionManagerProps) => {
    return (
        <div className="flex flex-col h-full border rounded-lg p-4">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold">Gerenciar Sessões</h2>
                <Button variant="outline" onClick={onAddSession}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Sessão
                </Button>
            </div>
            <div className="mt-4 space-y-2">
                {Object.values(sessions).map(session => (
                    <div key={session.id} onClick={() => onSessionSelect(session.id)} className="p-3 border rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-100">
                        <p>Sessão: {session.id.substring(0, 8)}</p>
                        <p>Status: {session.status}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}; 