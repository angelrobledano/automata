import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import IORedis from 'ioredis';
import { verifyWebhook, receiveMessage } from './webhooks/meta';
import billingRoutes from './billing/routes';
import { verifyDashboardJwt } from './utils/jwt';
import { resolveTargetRoom, roomForCommerce } from './utils/socket';
import { ensureVectorIndexes } from './rag/index';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);

// CORS: solo el dashboard de confianza puede abrir el socket.
// En producción, definir DASHBOARD_URL (ej. https://automata-pied.vercel.app).
const dashboardOrigin = process.env.DASHBOARD_URL || 'http://localhost:3000';

// CORS for Next.js dashboard
const io = new Server(server, {
  cors: {
    origin: dashboardOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// B-05: autenticación en el handshake — sin JWT válido del dashboard no hay socket.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  const payload = await verifyDashboardJwt(token);
  if (!payload?.commerceId) {
    next(new Error('unauthorized'));
    return;
  }
  socket.data.commerceId = payload.commerceId;
  socket.data.role = payload.role;
  next();
});

// Cada socket solo escucha los eventos de su propio comercio
io.on('connection', (socket) => {
  const commerceId = socket.data.commerceId as string;
  socket.join(roomForCommerce(commerceId));
  console.log(`[Socket.io] Cliente conectado al comercio ${commerceId}:`, socket.id);
  socket.on('disconnect', () => {
    console.log('[Socket.io] Cliente desconectado:', socket.id);
  });
});

import rateLimit from 'express-rate-limit';

// B-09: capturar el body EXACTO (bytes) para validar la firma HMAC de Meta.
// La firma se calcula sobre el body crudo; re-serializar JSON puede no coincidir.
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));

// B-31: detrás de proxy/LB (Vercel, nginx) la IP real viene en X-Forwarded-For;
// sin esto todos los clientes comparten un único cubo de rate limit.
app.set('trust proxy', 1);

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
    // B-05: solo se retransmite a la sala del comercio propietario.
    // Si el evento no lleva commerceId, se descarta (nunca broadcast global).
    const room = resolveTargetRoom(channel, data);
    if (!room) {
      console.warn(`[Socket.io] Evento sin commerceId en canal ${channel}, descartado.`);
      return;
    }
    if (channel === 'chat_updates') {
      io.to(room).emit('new_message', data);
    } else if (channel === 'order_events') {
      console.log(`[Socket.io] Retransmitiendo new_order a ${room}:`, data.order?.id);
      io.to(room).emit('new_order', data);
    }
  } catch (e) {
    console.error('[Socket.io] Error parseando mensaje de Redis:', e);
  }
});

server.listen(port, () => {
  console.log(`[Server] Escuchando en http://localhost:${port}`);
  console.log(`[Server] Webhook de Meta configurado en /api/webhooks/meta`);
  console.log(`[Server] Socket.io con CORS restringido a: ${dashboardOrigin}`);
  // B-30: garantizar índices vectoriales (HNSW) y de texto (GIN) en arranque.
  ensureVectorIndexes().catch(err => console.warn('[Server] Índices vectoriales no verificados:', err));
});

// Graceful shutdown: cerrar servidor HTTP, sockets y conexión Redis antes de salir
let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Server] ${signal} recibido. Cerrando servidor de forma ordenada...`);
  try {
    io.close();
    server.close();
    redisSub.quit();
  } catch (err) {
    console.error('[Server] Error durante el shutdown:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
