# 4. Cómo crear tu primera feature

1. **Sincroniza tu rama**: `git checkout main && git pull`
2. **Crea tu rama**: `git checkout -b feature/JD-123-nueva-funcionalidad`
3. **Modifica el código**: Mantén la lógica de negocio en `src/` y el UI en `dashboard/src/`.
4. **Si cambias la DB**: Edita `schema.prisma` y corre `npx prisma migrate dev --name descripcion_corta`.
5. **Abre un PR**: Revisa el `CONTRIBUTING.md`.
