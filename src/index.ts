import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import IORedis from 'ioredis';
import { verifyWebhook, receiveMessage } from './webhooks/meta';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);

// CORS for Next.js dashboard
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

import rateLimit from 'express-rate-limit';

app.use(express.json());

// GLOBAL RATE LIMITER
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window` (here, per 1 minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.' }
});

app.use('/api/', limiter);

// Rutas de Webhook de Meta
app.get('/api/webhooks/meta', verifyWebhook);
app.post('/api/webhooks/meta', receiveMessage);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Setup Redis Subscriber for WebSockets
const redisSub = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
redisSub.subscribe('chat_updates', (err, count) => {
  if (err) console.error('Error subscribing to Redis:', err);
});

redisSub.on('message', (channel, message) => {
  if (channel === 'chat_updates') {
    const data = JSON.parse(message);
    // Emitimos el evento a todos los clientes conectados al Dashboard
    io.emit('new_message', data);
  }
});

io.on('connection', (socket) => {
  console.log('[Socket.io] Nuevo cliente conectado:', socket.id);
  socket.on('disconnect', () => {
    console.log('[Socket.io] Cliente desconectado:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`[Server] Escuchando en http://localhost:${port}`);
  console.log(`[Server] Webhook de Meta configurado en /api/webhooks/meta`);
});
