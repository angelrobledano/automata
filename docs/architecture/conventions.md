# Convenciones de Arquitectura

- **Naming**: Variables y funciones en `camelCase`. Clases y Modelos en `PascalCase`. Archivos en `kebab-case.ts`.
- **Principios SOLID**: Aplica Inversión de Dependencias. Evita acoplar la IA a Meta directamente. Usa `ChannelConnection` como abstracción.
- **Errores**: Nunca devuelvas un 500 silencioso. Todo error debe registrarse en la consola o sistema de monitorización con el `commerceId` asociado.
- **Logs**: Formato esperado: `[Modulo] [CommerceID] Mensaje`.
- **Nuevos Módulos**: Crea un directorio nuevo si integras una plataforma externa completa (ej. `/src/integrations/stripe/`).
