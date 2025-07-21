import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import { initWhatsApp, removeSession } from './whatsappService';
import { db, admin } from './firebaseAdmin';

dotenv.config();

const logger = pino({
    transport: {
      target: 'pino-pretty'
    },
    level: 'info'
});

const allowedOrigins = [
  process.env.CLIENT_URL || 'https://gestorelite.app', // URL de produção
  'http://localhost:3000', // URL de desenvolvimento comum
  'http://localhost:9002'  // URL de desenvolvimento reportada no erro
];

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Lógica de autenticação movida para cá
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).send('Acesso não autorizado.');
    try {
        (req as any).user = await admin.auth().verifyIdToken(token);
        next();
    } catch (error) {
        res.status(401).send('Acesso não autorizado: Token inválido.');
    }
};

const authSocket = (logger: pino.Logger) => {
    return async (socket: Socket, next: (err?: Error) => void) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Autenticação falhou: token não fornecido.'));
        try {
            (socket as any).user = await admin.auth().verifyIdToken(token);
            next();
        } catch (error) {
            next(new Error('Autenticação falhou: token inválido.'));
        }
    };
};

io.use(authSocket(logger));

io.on('connection', (socket) => {
    const userId = (socket as any).user.uid;
    const userLogger = logger.child({ userId });

    userLogger.info('Novo cliente conectado via WebSocket.');

    socket.on('startSession', ({ sessionId }: { sessionId: string }) => {
        const sessionLogger = userLogger.child({ sessionId });
        sessionLogger.info('Cliente solicitou para iniciar/usar a sessão.');

        // Associa o socket a uma sala específica para o usuário e outra para a sessão
        socket.join(userId);
        socket.join(sessionId);

        // Inicia e configura a sessão do WhatsApp, passando o sessionId
        initWhatsApp(socket, io, userId, sessionId);
    });

    socket.on('disconnect', () => {
        userLogger.info('Cliente desconectado.');
        // A lógica de limpeza de sessão agora pode ser mais robusta,
        // talvez baseada em quais sessões o socket estava gerenciando.
        // Por enquanto, a lógica em `initWhatsApp` no evento 'disconnect' do socket.io cuidará disso.
    });
});

// Rota para deletar um chat e suas mensagens
// Rota para buscar todas as sessões de um usuário
app.get('/sessions', verifyToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const userLogger = logger.child({ userId });

    try {
        userLogger.info('Buscando sessões do WhatsApp.');
        const sessionsRef = db.collection('users').doc(userId).collection('whatsapp_sessions');
        const snapshot = await sessionsRef.get();

        if (snapshot.empty) {
            userLogger.info('Nenhuma sessão encontrada.');
            return res.status(200).json([]);
        }

        const sessionsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        userLogger.info(`Encontradas ${sessionsList.length} sessões.`);
        res.status(200).json(sessionsList);
    } catch (error) {
        userLogger.error({ error }, 'Erro ao buscar sessões.');
        res.status(500).send({ error: 'Falha ao buscar as sessões do WhatsApp.' });
    }
});


app.delete('/sessions/:sessionId/chats/:chatId', verifyToken, async (req: Request, res: Response) => {
    const userId = (req as any).user.uid;
    const { sessionId, chatId } = req.params;
    const sessionLogger = logger.child({ userId, sessionId, chatId });

    try {
        sessionLogger.info('Iniciando exclusão de chat.');

        const chatRef = db.collection('users').doc(userId).collection('whatsapp_sessions').doc(sessionId).collection('chats').doc(chatId);
        
        // Deletar subcoleção de mensagens (opcional, mas recomendado para limpeza completa)
        const messagesSnapshot = await chatRef.collection('messages').get();
        if (!messagesSnapshot.empty) {
            const batch = db.batch();
            messagesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            sessionLogger.info(`Lote de ${messagesSnapshot.size} mensagens deletado.`);
        }
        
        await chatRef.delete();
        sessionLogger.info('Chat deletado com sucesso.');
        res.status(200).send({ message: 'Chat deletado com sucesso.' });

    } catch (error) {
        sessionLogger.error({ error }, 'Erro ao deletar o chat.');
        res.status(500).send({ error: 'Falha ao deletar o chat.' });
    }
});

httpServer.listen(port, () => {
    logger.info(`Servidor rodando na porta ${port}`);
}); 