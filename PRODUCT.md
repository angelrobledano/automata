# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Perfil principal**: Comerciantes, hosteleros y propietarios de negocios locales (panaderías, obradores, restaurantes, tiendas de barrio) y comercios online con WooCommerce o Shopify.
- **Situación de uso**: Negocios con alto volumen de consultas repetitivas en WhatsApp durante las horas punta o fuera de horario comercial, perdiendo ventas por no atender a tiempo o cometiendo errores al anotar encargos a mano.
- **Trabajo a realizar (Job-to-be-done)**: Atender de forma impecable y personalizada a sus clientes 24/7, tomar pedidos y reservas reales sin alucinaciones de precios ni horarios festivos, y gestionar todo el flujo comercial desde un panel sencillo y luminoso.

## Product Purpose

Automatizar la atención al cliente y la captura de pedidos omnicanal vía WhatsApp con calidad humana, eliminando la pérdida de pedidos fuera de horario y asegurando que las reglas del negocio (horarios vigentes, festivos, precios y opciones de recogida/envío) se cumplan de manera estricta y sin contradicciones.

## Positioning

A diferencia de los chatbots genéricos o plataformas complejas que alucinan o confunden horarios pasados con vigentes, **Automata** cuenta con un motor determinista de resolución de hechos y una capa de control de calidad inmutable (Knowledge & Quality Layer) junto a un adaptador multitienda que registra encargos reales en mostrador, WooCommerce o Shopify.

## Operating Context

- **Canales de entrada**: WhatsApp Business (Meta Cloud API oficial).
- **Entornos de integración**: WooCommerce REST API, Shopify Admin API y almacén directo en PostgreSQL para comercios sin plataforma web.
- **Panel de control**: Aplicación web de escritorio y móvil (`/pedidos`, `/conversaciones`, `/cerebro`, `/dashboard`) operada por el comerciante o sus empleados en mostrador, cocina o almacén.
- **Intervención humana (Handoff)**: Notificación instantánea y derivación a agente humano cuando un cliente requiere atención personalizada o surgen casos no previstos.

## Capabilities and Constraints

- **Toma de pedidos multitienda**: Soporte de encargos locales con recogida en tienda (`PICKUP`) o entrega a domicilio (`DELIVERY`), sincronización bidireccional de estados (`PENDING`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`).
- **Resolución determinista de hechos (RAG híbrido)**: Las reglas de mayor prioridad (ej. horario de verano o cierres festivos) anulan de forma garantizada las reglas habituales.
- **Llamada a herramientas (Tool Calling)**: Ejecución segura de la función `take_order` con validación post-generación.
- **Facturación SaaS y cuotas**: Control de consumo de conversaciones con Stripe (`FeatureGuard`) y degradación suave.
- **Restricción de terminología**: Prohibido el uso de jerga técnica ("tokens", "embeddings", "vectorial") en cualquier texto orientado al comerciante.

## Brand Commitments

- **Identidad visual oficial**: **Light Mode moderno y luminoso** (`#F8FAFC`, tarjetas en blanco puro `#FFFFFF`, bordes `#E5E7EB` y tipografía de alto contraste `#0F172A`).
- **Color de acento**: Azul e-commerce oficial (`#2563EB` / `blue-600` con hover `#1D4ED8`) para acciones de conversión y estados clave.
- **Tono y voz**: Profesional, directo, claro y orientado al comercio real (pedidos, clientes, ventas, catálogo).

## Evidence on Hand

- Base de datos relacional PostgreSQL con pgvector y modelo `Order` funcional en Supabase y Docker local.
- Suites de pruebas unitarias al 100% (59/59 tests pasados entre backend y dashboard).
- Integración verificada con Meta Cloud API para WhatsApp y Stripe para suscripciones.

## Product Principles

1. **Claridad comercial absoluta**: Cada pantalla, métrica y mensaje debe explicarse en el lenguaje cotidiano de una tienda o restaurante.
2. **Cero alucinaciones en datos críticos**: Precios, horarios y festivos provienen de hechos deterministas resueltos, nunca de invenciones probabilísticas del modelo.
3. **Usabilidad sin fricción para el comerciante**: Gestión de pedidos en un clic, botón directo a WhatsApp del cliente y visualización sin sobrecarga cognitiva.
4. **Respaldo y fallback seguro**: Si una tienda online externa falla o no está conectada, el pedido se guarda localmente sin perder jamás una venta.
