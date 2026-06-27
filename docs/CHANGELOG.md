# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Arquitectura asíncrona basada en BullMQ para procesamiento de Meta Webhooks.
- Sistema Híbrido RAG (PgVector + BM25) para inyección de contexto.
- Panel de control (Dashboard) en Next.js para gestionar conversaciones.
- Integración nativa con OpenAI (`gpt-4o-mini`).
- Funcionalidad de Handoff (Intervención humana pausando al bot).

### Fixed
- Error de bloqueo de Meta por `undefined metadata` resuelto con fallbacks robustos.
- Afinación de umbral de cosine similarity (0.75) para el RAG en español.
