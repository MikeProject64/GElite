import makeWASocket, { DisconnectReason, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Server, Socket as SocketIO } from 'socket.io';
import qrcode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import logger from './logger';
import { isJidUser } from '@whiskeysockets/baileys';
import { db } from './firebaseAdmin';
import admin from 'firebase-admin';

const sessions = new Map<string, WASocket>();
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

async function createWhatsAppSocket(userId: string, sessionId: string, io: Server): Promise<WASocket> {
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const sessionLogger = logger.child({ userId, sessionId });

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: sessionLogger.child({ service: 'Baileys' })
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            sessionLogger.info('QR Code recebido, enviando para o cliente.');
            const qrCodeUrl = await qrcode.toDataURL(qr);
            io.to(sessionId).emit('qr', { sessionId, qrCodeUrl });
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.connectionReplaced;
            
            sessionLogger.warn({ reason: lastDisconnect?.error, statusCode }, `Conexão fechada. Reconectando: ${shouldReconnect}`);
            sessions.delete(sessionId);

            if (shouldReconnect) {
                sessionLogger.info('Tentando reconectar...');
                createWhatsAppSocket(userId, sessionId, io);
            } else if (statusCode === DisconnectReason.connectionReplaced) {
                sessionLogger.warn('Conexão substituída.');
                io.to(sessionId).emit('replaced', { sessionId, message: 'Sua sessão foi conectada em outro local.' });
            } else {
                sessionLogger.info('Desconexão permanente. Limpando sessão.');
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                }
                io.to(sessionId).emit('disconnected', { sessionId, message: 'Você foi desconectado permanentemente.' });
            }
        } else if (connection === 'open') {
            sessionLogger.info('Conexão com o WhatsApp estabelecida!');
            sessions.set(sessionId, sock);
            io.to(sessionId).emit('connected', { sessionId, message: 'Conectado com sucesso ao WhatsApp!' });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe || !isJidUser(m.key.remoteJid!)) return;

        sessionLogger.info({ msg: m }, 'Nova mensagem recebida.');
        const contactId = m.key.remoteJid!;
        const messageContent = m.message.conversation || m.message.extendedTextMessage?.text || '';
        const messageTimestamp = new Date(Number(m.messageTimestamp) * 1000);

        try {
            const chatRef = db.collection('users').doc(userId).collection('whatsapp_sessions').doc(sessionId).collection('chats').doc(contactId);
            const messageRef = chatRef.collection('messages');

            await messageRef.add({
                fromMe: false,
                text: messageContent,
                timestamp: messageTimestamp,
            });

            await chatRef.set({
                name: m.pushName || contactId.split('@')[0],
                unreadCount: admin.firestore.FieldValue.increment(1),
                lastMessage: messageContent,
                lastMessageTimestamp: messageTimestamp,
            }, { merge: true });

            sessionLogger.info({ contactId }, 'Mensagem salva no Firestore.');

            io.to(sessionId).emit('new_message', {
                sessionId,
                contactId,
                message: {
                    fromMe: false,
                    text: messageContent,
                    timestamp: messageTimestamp.toISOString(),
                }
            });
        } catch (error) {
            sessionLogger.error({ error, contactId }, "Erro ao salvar mensagem no Firestore.");
        }
    });

    return sock;
}

export function initWhatsApp(socketIO: SocketIO, io: Server, userId: string, sessionId: string) {
    const sessionLogger = logger.child({ userId, sessionId, socketId: socketIO.id });
    sessionLogger.info('Iniciando gerenciamento de sessão de WhatsApp.');

    createWhatsAppSocket(userId, sessionId, io);

    socketIO.on('check_number', async ({ sessionId, phoneNumber }: { sessionId: string, phoneNumber: string }) => {
        const sock = sessions.get(sessionId);
        const checkLogger = sessionLogger.child({ phoneNumber });
        checkLogger.info('Verificando número de telefone.');

        if (sock) {
            try {
                const formattedNumber = phoneNumber.replace(/\D/g, '');
                const [result] = await sock.onWhatsApp(formattedNumber);

                if (result?.exists) {
                    checkLogger.info({ jid: result.jid }, 'Número válido. Criando/verificando chat no DB.');
                    const chatRef = db.collection('users').doc(userId).collection('whatsapp_sessions').doc(sessionId).collection('chats').doc(result.jid);
                    await chatRef.set({
                        name: formattedNumber,
                        lastMessageTimestamp: new Date(),
                    }, { merge: true });
                    
                    socketIO.emit('number_check_result', {
                        sessionId,
                        valid: true,
                        jid: result.jid,
                        number: formattedNumber,
                    });
                } else {
                    checkLogger.warn('Número não encontrado no WhatsApp.');
                    socketIO.emit('number_check_result', {
                        sessionId,
                        valid: false,
                        error: 'Este número não possui uma conta no WhatsApp.'
                    });
                }
            } catch (error) {
                checkLogger.error({ error }, "Erro ao verificar número.");
                socketIO.emit('number_check_result', {
                    sessionId,
                    valid: false,
                    error: 'Ocorreu um erro ao verificar o número.'
                });
            }
        } else {
             checkLogger.warn('Sessão não encontrada para verificação de número.');
        }
    });

    socketIO.on('send_message', async ({ sessionId, contactId, content }: { sessionId: string, contactId: string, content: string }) => {
        const sock = sessions.get(sessionId);
        const sendLogger = sessionLogger.child({ contactId });

        if (sock && content) {
            try {
                await sock.sendMessage(contactId, { text: content });
                sendLogger.info('Mensagem enviada com sucesso via Baileys.');

                const messageTimestamp = new Date();
                const chatRef = db.collection('users').doc(userId).collection('whatsapp_sessions').doc(sessionId).collection('chats').doc(contactId);
                
                await chatRef.collection('messages').add({
                    fromMe: true,
                    text: content,
                    timestamp: messageTimestamp,
                });

                await chatRef.set({
                    lastMessage: content,
                    lastMessageTimestamp: messageTimestamp,
                }, { merge: true });

            } catch (error) {
                sendLogger.error({ error }, "Erro ao enviar mensagem.");
                socketIO.emit('send_error', { sessionId, contactId, error: 'Falha ao enviar a mensagem.' });
            }
        } else {
            sendLogger.warn({ hasSocket: !!sock, hasContent: !!content }, 'Não foi possível enviar a mensagem. Sessão ou conteúdo ausente.');
        }
    });

    socketIO.on('logout_session', async ({ sessionId }: { sessionId: string }) => {
        const logoutLogger = sessionLogger.child({ targetSessionId: sessionId });
        logoutLogger.info('Recebida solicitação de logout.');
        
        const sock = sessions.get(sessionId);
        if (sock) {
            try {
                await sock.logout();
            } catch (error) {
                logoutLogger.error({ error }, 'Erro ao fazer logout da sessão do Baileys.');
            } finally {
                sessions.delete(sessionId);
                const sessionPath = path.join(SESSIONS_DIR, sessionId);
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    logoutLogger.info('Pasta da sessão removida do disco.');
                }
            }
        }
        
        io.to(sessionId).emit('disconnected', { sessionId, message: 'Você foi desconectado com sucesso.' });
    });

    socketIO.on('request_new_qr', ({ sessionId }: { sessionId: string }) => {
        sessionLogger.info({ targetSessionId: sessionId }, 'Recebida solicitação de novo QR Code.');
        createWhatsAppSocket(userId, sessionId, io);
    });

    socketIO.on('disconnect', () => {
        sessionLogger.info('Cliente desconectado do Socket.IO.');
        // Não removemos mais a sessão do Baileys aqui, pois um usuário pode
        // apenas ter fechado a aba do navegador, mas quer manter a sessão WA ativa.
        // A limpeza agora é tratada principalmente pelo logout explícito ou DisconnectReason.loggedOut.
    });
}

export function removeSession(sessionId: string) {
    const sessionLogger = logger.child({ sessionId });
    const sock = sessions.get(sessionId);
    if (sock) {
        try {
            sock.logout();
            sessionLogger.info('Sessão desconectada via removeSession.');
        } catch (error) {
            sessionLogger.error({ error }, 'Erro ao fazer logout em removeSession.');
        } finally {
            sessions.delete(sessionId);
        }
    }

    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        sessionLogger.info('Pasta da sessão removida do disco via removeSession.');
    }
} 