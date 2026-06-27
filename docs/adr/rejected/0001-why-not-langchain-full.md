# ADR Descartado: ¿Por qué NO usar todo el framework LangChain?

Decidimos usar LangChain SOLO para los TextSplitters, pero no para las Chains ni los Agents.
**Motivo:** LangChain introduce una abstracción muy pesada que dificulta debugear qué Prompt exacto se envía a OpenAI, y complica la inyección de metadatos multitenant. Preferimos llamadas directas al SDK de OpenAI.
