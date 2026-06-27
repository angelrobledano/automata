# Contributing to Mi Negocio IA

¡Gracias por tu interés en contribuir! Este es un proyecto Open Source de calidad empresarial.

## 1. Flujo de Trabajo (Git Flow)
1. Haz un fork del repositorio.
2. Crea una rama desde `main` (`feature/nueva-funcionalidad` o `bugfix/solucion-error`).
3. Haz tus cambios.
4. Envía una Pull Request contra `main`.

## 2. Convenciones de Código
- **Backend:** Node.js, Express, BullMQ, Prisma. Usa TypeScript estricto.
- **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui.
- **Formateo:** Usa Prettier y ESLint antes de hacer commit.
- **Base de Datos:** No modifiques el esquema en producción directamente. Crea siempre migraciones (`npx prisma migrate dev`).

## 3. Arquitectura
Por favor revisa `docs/architecture/overview.md` antes de tocar código core (ej. Webhooks, BullMQ).

## 4. Checklist para Pull Requests
- [ ] Mi código sigue las convenciones de estilo.
- [ ] He añadido o actualizado los tests correspondientes.
- [ ] He ejecutado `npm run test` y todo pasa.
- [ ] He documentado cualquier cambio de arquitectura en `docs/adr/`.
