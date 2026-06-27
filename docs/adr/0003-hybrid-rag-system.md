# ADR 0003: Sistema RAG Híbrido y Fusión (RRF)

## Contexto
El bot de IA debe responder de forma extremadamente fiel a las bases de conocimiento de cada comercio. Sin embargo, la búsqueda puramente semántica (vectorial) a veces falla al buscar identificadores exactos (como SKUs de productos o nombres de marcas específicas), ya que vectores que suenan similares pueden tener puntuaciones altas aunque no sean exactamente el identificador buscado.

## Problema
Una búsqueda puramente léxica (palabras clave) ignora sinónimos ("horario" vs "cuándo abren"). Una búsqueda puramente semántica (vectores) ignora palabras literales cortas ("zapatilla modelo XT-90").

## Decisión
Se implementó un Sistema RAG Híbrido, combinando la precisión exacta de BM25/FTS (Búsqueda Léxica) con la comprensión del lenguaje natural de PgVector. Los resultados de ambos motores se ordenan utilizando el algoritmo **Reciprocal Rank Fusion (RRF)**.

## Consecuencias y Ventajas
- **Ventaja**: Alta precisión. El bot entenderá tanto "a qué hora cierran" (Semántica) como "Dime el precio del producto SKU-900" (Léxica).
- **Ventaja**: Cero dependencias adicionales, ya que PostgreSQL puede encargarse tanto de BM25 (TsVector) como de Vector Search en una sola Query.
- **Riesgo**: La indexación de los fragmentos en la BBDD es un poco más lenta al tener que mantener dos índices (HNSW para vectores y GIN para TsVector).
