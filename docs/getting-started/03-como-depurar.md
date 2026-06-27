# 3. Cómo Depurar (Debugging)

## Backend (Workers y Webhooks)
- Usa los logs de consola: Todos los logs importantes de BullMQ tienen el prefijo `[Worker]`.
- Si necesitas pausar el código, usa el flag `--inspect` de Node.js en el script de arranque, o usa la pestaña "Run and Debug" de VS Code adjuntándote al puerto de depuración.

## Next.js
- Abre las DevTools de Chrome. Revisa la pestaña de Red (Network) para llamadas a `/api`.
- Si fallan los WebSockets, revisa la pestaña WS (WebSockets) en Network.

## Redis
Usa `redis-cli` o una GUI como *Another Redis Desktop Manager* para ver el estado de los jobs fallidos en BullMQ.
