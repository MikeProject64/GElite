import makeWASocket, { DisconnectReason, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Server, Socket as SocketIO } from 'socket.io';
import qrcode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import logger from './logger';

const sessions = new Map<string, WASocket>();
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

async function createWhatsAppSocket(sessionId: string, socketIO: SocketIO): Promise<WASocket> {
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const sessionLogger = logger.child({ sessionId });

        if (qr) {
            sessionLogger.info('QR Code recebido, enviando para o cliente...');
            const qrCodeUrl = await qrcode.toDataURL(qr);
            socketIO.emit('qr', qrCodeUrl);
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            
            // Não reconectar se:
            // 1. O usuário fez logout.
            // 2. A conexão foi substituída por outra sessão.
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.connectionReplaced;

            sessionLogger.warn({ reason: lastDisconnect?.error, statusCode }, `Conexão fechada. Reconectando: ${shouldReconnect}`);
            
            sessions.delete(sessionId);

            if (shouldReconnect) {
                sessionLogger.info('Tentando reconectar...');
                createWhatsAppSocket(sessionId, socketIO); // Tenta recriar o socket
            } else if (statusCode === DisconnectReason.connectionReplaced) {
                sessionLogger.warn('Conexão substituída por outra sessão.');
                socketIO.emit('replaced', 'Sua sessão foi conectada em outro local.');
            } else {
                sessionLogger.info('Desconexão permanente. Limpando sessão do disco.');
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                }
                socketIO.emit('disconnected', 'Você foi desconectado permanentemente.');
            }
        } else if (connection === 'open') {
            sessionLogger.info('Conexão com o WhatsApp estabelecida!');
            sessions.set(sessionId, sock);
            socketIO.emit('connected', 'Conectado com sucesso ao WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}

// Mapeia o UID do usuário para sua conexão de socket.io
const userSocketMap = new Map<string, SocketIO>();

export function initWhatsApp(socketIO: SocketIO, io: Server, userId: string) {
    logger.info({ userId, socketId: socketIO.id }, 'Iniciando gerenciamento de sessão de WhatsApp.');
    
    userSocketMap.set(userId, socketIO);

    createWhatsAppSocket(userId, socketIO);

    socketIO.on('disconnect', () => {
        logger.info({ userId, socketId: socketIO.id }, 'Cliente desconectado do Socket.IO.');
        // Remove a referência do socket, mas não a sessão do Baileys.
        // Se o usuário se reconectar, ele será associado à sessão existente.
        userSocketMap.delete(userId);
    });
} 