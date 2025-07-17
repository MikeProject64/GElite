'use client';

import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider'; // Importar o hook de autenticação

const WhatsAppPage = () => {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Autenticando...');
    const [socket, setSocket] = useState<Socket | null>(null);
    const { user } = useAuth(); // Apenas o usuário é necessário

    useEffect(() => {
        if (!user) {
            setStatus('Você precisa estar logado para conectar o WhatsApp.');
            return;
        }

        const backendUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:3001';
        const newSocket = io(backendUrl);
        setSocket(newSocket);

        newSocket.on('connect', async () => {
            console.log('Conectado ao backend. Enviando token para autenticação...');
            setStatus('Conectado ao serviço. Autenticando sua sessão...');
            try {
                const token = await user.getIdToken();
                if (token) {
                    newSocket.emit('auth', token);
                } else {
                    setStatus('Não foi possível obter o token de autenticação. Tente recarregar a página.');
                }
            } catch (error) {
                console.error("Erro ao obter o token de ID:", error);
                setStatus('Ocorreu um erro ao obter suas credenciais. Tente novamente.');
            }
        });

        newSocket.on('qr', (qr: string) => {
            console.log('QR Code recebido');
            setQrCode(qr);
            setStatus('Por favor, escaneie o QR Code com seu celular.');
        });
        
        newSocket.on('connected', (message: string) => {
            console.log(message);
            setQrCode(null);
            setStatus('Conectado com sucesso ao WhatsApp!');
        });

        newSocket.on('disconnected', (message: string) => {
            console.log(message);
            setStatus(`Desconectado: ${message}`);
        });

        newSocket.on('replaced', (message: string) => {
            console.error(`Conexão substituída: ${message}`);
            setStatus(`Conexão perdida: ${message}. Verifique seus dispositivos conectados.`);
            newSocket.disconnect();
        });

        newSocket.on('auth_error', (message: string) => {
            console.error(`Erro de autenticação: ${message}`);
            setStatus(`Erro de autenticação: ${message}. Verifique suas credenciais e tente novamente.`);
            newSocket.disconnect();
        });

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    return (
        <div className="container mx-auto p-4">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Conectar WhatsApp</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                    <p className="mb-4 text-center">{status}</p>
                    {qrCode && (
                        <div className="p-4 border rounded-md">
                            <Image
                                src={qrCode}
                                alt="QR Code do WhatsApp"
                                width={256}
                                height={256}
                            />
                        </div>
                    )}
                    {!qrCode && status.includes('Conectado') && (
                         <div className="text-center">
                            <p className="text-green-500 font-bold">✓ Conectado!</p>
                            <p className="text-sm text-gray-500">Você já pode fechar esta página.</p>
                         </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatsAppPage; 