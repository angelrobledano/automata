"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const meta_1 = require("./webhooks/meta");
const routes_1 = __importDefault(require("./billing/routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const server = http_1.default.createServer(app);
// CORS for Next.js dashboard
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
app.use(express_1.default.json());
// GLOBAL RATE LIMITER
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per `window` (here, per 1 minute)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Demasiadas peticiones desde esta IP, por favor intenta más tarde.' }
});
app.use('/api/', limiter);
// Rutas de Webhook de Meta
app.get('/api/webhooks/meta', meta_1.verifyWebhook);
app.post('/api/webhooks/meta', meta_1.receiveMessage);
// Rutas de Billing y Planes
app.use('/api/billing', routes_1.default);
app.use('/api/admin', routes_1.default); // En producción iría en su propio router
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
// Setup Redis Subscriber for WebSockets
const redisSub = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
redisSub.subscribe('chat_updates', (err, count) => {
    if (err)
        console.error('Error subscribing to Redis:', err);
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
//# sourceMappingURL=index.js.map