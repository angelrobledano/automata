# Checklist de Release (Producción)

Antes de fusionar a `main` y desplegar:
- [ ] Migraciones prisma ejecutadas y revisadas (`prisma migrate status`).
- [ ] Variables de entorno revisadas (Nuevas variables en `.env.example`).
- [ ] Tests de integración en verde.
- [ ] Dashboard compila (`npm run build` en Next.js no lanza errores).
