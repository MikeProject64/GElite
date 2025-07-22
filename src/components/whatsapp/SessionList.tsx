import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppSession {
    id: string;
    name: string;
    status: 'disconnected' | 'connected' | 'connecting' | 'qr' | 'error' | 'replaced';
}

interface SessionListProps {
    sessions: Record<string, WhatsAppSession>;
    activeSessionId: string | null;
    onSessionClick: (sessionId: string) => void;
    onNewSessionClick: () => void;
}

export function SessionList({ sessions, activeSessionId, onSessionClick, onNewSessionClick }: SessionListProps) {
    return (
        <aside className="w-1/4 bg-gray-100 dark:bg-gray-800 p-4 border-r">
            <h1 className="text-2xl font-bold mb-4">Sessões</h1>
            <Button className="w-full mb-4" onClick={onNewSessionClick}>
                <Plus className="mr-2 h-4 w-4" /> Nova Sessão
            </Button>
            <div className="space-y-2">
                {Object.values(sessions).map(session => (
                    <div key={session.id}
                         onClick={() => onSessionClick(session.id)}
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
    );
}
