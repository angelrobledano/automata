# ADR 0001: Selección de PostgreSQL y Prisma ORM

## Contexto
El sistema necesita almacenar datos relacionales tradicionales (Comercios, Usuarios, Mensajes de Historial, etc.) además de requerir capacidades avanzadas para la Búsqueda Semántica de IA (vectores densos para el RAG).

## Problema
Tener una base de datos relacional (ej. MySQL) y una base de datos vectorial externa (ej. Pinecone, Milvus) incrementa la complejidad operativa, obliga a sincronizar datos distribuidos y añade costes de latencia y facturación de terceros.

## Opciones Consideradas
1. MySQL/MariaDB + Pinecone/Weaviate externo.
2. MongoDB Atlas con Vector Search.
3. PostgreSQL con la extensión `pgvector`.

## Decisión
Se eligió **PostgreSQL** utilizando la extensión nativa **`pgvector`** y **Prisma ORM** como capa de acceso a datos.

## Consecuencias y Ventajas
- **Ventaja**: Unificación de infraestructura. Mantenemos el esquema relacional estricto (integridad referencial, ON DELETE CASCADE) y los vectores de IA en la misma base de datos, lo que hace trivial las consultas "Híbridas" (búscame este vector PERO filtra por `commerceId`).
- **Ventaja**: Prisma ORM proporciona un tipado estricto en TypeScript de extremo a extremo, lo que reduce errores en tiempo de ejecución.
- **Ventaja**: Evitamos costes mensuales de proveedores SaaS de bases vectoriales.
- **Riesgo**: Prisma tiene soporte parcial para consultas SQL complejas de similitud vectorial, por lo que algunas queries críticas requieren `$queryRaw` crudo (como la Búsqueda por Distancia Coseno `<=>`). Esto está encapsulado y documentado en el código fuente (`src/rag/index.ts` y `src/worker.ts`).
