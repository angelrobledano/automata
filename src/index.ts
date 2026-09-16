import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import IORedis from 'ioredis';
import { verifyWebhook, receiveMessage } from './webhooks/meta';
import billingRoutes from './billing/routes';

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

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));

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

// Rutas de Billing y Planes
app.use('/api/billing', billingRoutes);
app.use('/api/admin', billingRoutes); // En producción iría en su propio router

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Setup Redis Subscriber for WebSockets
const redisSub = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
redisSub.subscribe('chat_updates', 'order_events', (err, count) => {
  if (err) console.error('Error subscribing to Redis channels:', err);
  else console.log(`[Socket.io] Suscrito a canales de Redis: chat_updates, order_events`);
});

redisSub.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);
    if (channel === 'chat_updates') {
      io.emit('new_message', data);
    } else if (channel === 'order_events') {
      console.log('[Socket.io] Retransmitiendo new_order:', data.order?.id);
      io.emit('new_order', data);
    }
  } catch (e) {
    console.error('[Socket.io] Error parseando mensaje de Redis:', e);
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
