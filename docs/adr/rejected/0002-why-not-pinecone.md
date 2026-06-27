# ADR Descartado: ¿Por qué NO Pinecone o Supabase Vector?

**Pinecone:** Añade una dependencia de red externa, latencia y un modelo de precios alto.
**Supabase:** Nosotros alojamos nuestra propia BD, por lo que usamos la misma extensión `pgvector` nativa, eliminando la necesidad de un servicio de BD como plataforma de terceros (BaaS).
