# Integración: OpenAI

El sistema utiliza la API de OpenAI como núcleo de razonamiento (LLM) y para vectorización.

## 1. Embeddings (Vectorización)
Utilizamos el modelo `text-embedding-3-small`. Este modelo fue seleccionado porque ofrece un balance excelente entre coste ($0.02 / 1M tokens), velocidad y alta dimensionalidad (1536 dimensiones), siendo suficiente para la búsqueda de información RAG en español.

## 2. Generación de Textos (Chat Completions)
Por defecto, el comercio se configura con `gpt-4o-mini`, que provee capacidades avanzadas de razonamiento casi al mismo coste que GPT-3.5-Turbo.

### El System Prompt "Frankenstein"
El motor RAG construye el prompt de OpenAI de forma dinámica concatenando:
1. Las instrucciones generales del comercio (`commerce.systemPrompt`).
2. El contexto matemático devuelto por PgVector.
3. Un bloque estricto de "Cero Alucinaciones" inyectado a nivel de sistema.

## 3. Presupuesto y Límites (Tokens)
- La tabla de `Commerce` define `monthlyTokenBudget` (ej. 100,000 tokens).
- Cada vez que el Worker llama a `generateAIResponse`, hace una fórmula matemática aproximada para contar los tokens ingeridos y generados (longitud / 4) y actualiza el contador mensual del comercio.
- Si el comercio supera el presupuesto, la IA deja de responder y envía un mensaje por defecto de "Mantenimiento", bloqueando llamadas adicionales a la API de OpenAI para evitar costes sorpresa de facturación a la plataforma.
