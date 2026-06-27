# Checklist de Base de Datos

- [ ] Extension `pgvector` instalada y habilitada (`CREATE EXTENSION IF NOT EXISTS vector;`).
- [ ] Índices HNSW o IVFFlat creados en tablas vectoriales para acelerar el RAG.
- [ ] Backups diarios configurados con PITR (Point in Time Recovery) activado.
