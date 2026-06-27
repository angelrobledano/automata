# Checklist de Despliegue

- [ ] Docker Compose de producción levantado (`docker-compose.prod.yml`).
- [ ] Variables de entorno inyectadas en Vercel/Railway.
- [ ] Conexión a Redis activa (`redis-cli ping`).
- [ ] Los Workers consumen colas (`pm2 logs` o consola de Railway).
- [ ] El túnel de Meta (o dominio seguro) devuelve HTTP 200 en `/api/health`.
