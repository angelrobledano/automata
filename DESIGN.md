---
name: Automata
description: Asistente comercial inteligente y panel de gestión de pedidos 24/7 para comercio local y e-commerce
colors:
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  primary-tint: "#EFF6FF"
  neutral-bg: "#F8FAFC"
  neutral-surface: "#FFFFFF"
  neutral-subtle: "#F1F5F9"
  border-subtle: "#E5E7EB"
  border-strong: "#CBD5E1"
  text-primary: "#0F172A"
  text-secondary: "#64748B"
  text-tertiary: "#94A3B8"
  status-pending-bg: "#FEF3C7"
  status-pending-text: "#92400E"
  status-pending-border: "#FDE68A"
  status-preparing-bg: "#EFF6FF"
  status-preparing-text: "#1E40AF"
  status-preparing-border: "#BFDBFE"
  status-ready-bg: "#ECFDF5"
  status-ready-text: "#065F46"
  status-ready-border: "#A7F3D0"
  status-delivered-bg: "#F1F5F9"
  status-delivered-text: "#334155"
  status-delivered-border: "#CBD5E1"
  status-cancelled-bg: "#FFF1F2"
  status-cancelled-text: "#BE123C"
  status-cancelled-border: "#FECDD3"
  channel-woo-bg: "#FAF5FF"
  channel-woo-text: "#6B21A8"
  channel-woo-border: "#E9D5FF"
  channel-shopify-bg: "#ECFDF5"
  channel-shopify-text: "#047857"
  channel-shopify-border: "#A7F3D0"
  channel-manual-bg: "#EFF6FF"
  channel-manual-text: "#1D4ED8"
  channel-manual-border: "#BFDBFE"
typography:
  display:
    fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-sans), system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
  code:
    fontFamily: "var(--font-mono), ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Automata

## Overview

**Creative North Star: "El Mostrador Luminoso" (The Luminous Counter)**

Automata está diseñado para evocar la sensación de un mostrador de comercio impecable, luminoso y organizado al milímetro. La pantalla debe transmitir de inmediato orden, rapidez de despacho y certidumbre. El comerciante o dependiente no tiene tiempo para descifrar interfaces densas o barrocas: necesita saber qué pedidos están pendientes, cuáles están en cocina o empaquetado y cuáles están listos para entregar con una mirada de dos segundos.

La estética huye de los esquemas oscuros de hackers y de los degradados violetas genéricos de software de inteligencia artificial. En su lugar, abraza una atmósfera de luz natural matinal: lienzo gris suave (`#F8FAFC`), bandejas en blanco puro (`#FFFFFF`) delimitadas por una sutil perfilería gris (`#E5E7EB`), y llamadas a la acción en un azul e-commerce enérgico y seguro (`#2563EB`).

**Key Characteristics:**
- **Claridad instantánea**: Jerarquía tipográfica de alto contraste (`#0F172A` sobre `#FFFFFF`), facilitando la lectura bajo iluminación de tienda o en movilidad.
- **Estructura estratificada y plana**: Superficies que no flotan con sombras teatrales, sino que descansan ordenadamente sobre el plano base con bordes limpios de 1px.
- **Micro-estados semánticos**: Códigos de color directos y funcionales para los estados del pedido (ámbar para alertas pendientes, azul para elaboración, esmeralda para entregas).
- **Lenguaje comercial de alta fidelidad**: Botones orientados a acciones de tienda ("Preparar", "Marcar Listo", "WhatsApp", "Nuevo Encargo").

---

## Colors

Paleta sobria de base clara y acentos semánticos nítidos para una lectura veloz en entornos de retail.

### Primary
- **Azul E-commerce Acción** (`#2563EB` / `blue-600`): Botones de acción primaria ("Nuevo Encargo", "Guardar cambios", "Preparar"), estados activos de navegación y puntos de interacción principal.
- **Azul E-commerce Hover** (`#1D4ED8` / `blue-700`): Estado hover de interactivos primarios.
- **Azul Tonal Sutil** (`#EFF6FF` / `blue-50`): Fondos de selección activa, pestañas seleccionadas y badges de pedidos manuales.

### Neutral
- **Fondo Lienzo Base** (`#F8FAFC` / `slate-50`): Fondo general de la aplicación. Descansa la vista y resalta las tarjetas blancas.
- **Superficie Tarjetas** (`#FFFFFF`): Contenedores, modales, barras de navegación y tarjetas de pedido.
- **Borde Estructural Sutil** (`#E5E7EB` / `slate-200`): Delimitación perimetral de todas las tarjetas e inputs.
- **Texto Principal** (`#0F172A` / `slate-900`): Títulos, cifras monetarias y nombres de clientes. Contraste > 12:1.
- **Texto Secundario / Metadatos** (`#64748B` / `slate-500`): Marcas de tiempo, teléfonos, etiquetas de campo y subtítulos. Contraste mínimo 4.6:1 (Cumplimiento WCAG 2.1 AA).

### Semantic & Channels
- **Pendiente / Alerta**: Fondo `#FEF3C7`, texto `#92400E`, borde `#FDE68A` (ámbar de atención sin estridencia).
- **En Preparación**: Fondo `#EFF6FF`, texto `#1E40AF`, borde `#BFDBFE` (azul operativo).
- **Listo / Éxito**: Fondo `#ECFDF5`, texto `#065F46`, borde `#A7F3D0` (verde esmeralda de confirmación).
- **Entregado / Archivo**: Fondo `#F1F5F9`, texto `#334155`, borde `#CBD5E1` (gris neutro completado).
- **Cancelado / Error**: Fondo `#FFF1F2`, texto `#BE123C`, borde `#FECDD3` (rosa carmín para rechazos o errores).
- **Canal WooCommerce**: Fondo `#FAF5FF`, texto `#6B21A8`, borde `#E9D5FF` (púrpura identificativo oficial).
- **Canal Shopify**: Fondo `#ECFDF5`, texto `#047857`, borde `#A7F3D0` (verde bosque corporativo).
- **Canal WhatsApp / Local**: Fondo `#EFF6FF`, texto `#1D4ED8`, borde `#BFDBFE` (azul comunicativo).

### Named Rules
**La Regla del Azul Decisivo (The Decisive Blue Rule).** El color primario `#2563EB` se reserva exclusivamente para elementos que provocan una acción de negocio (crear un pedido, confirmar un cambio, avanzar un estado). Queda prohibido usar azul primario en fondos extensos, cabeceras decorativas o texto no interactivo.

---

## Typography

Familia limpia, geométrica y de alta legibilidad en pantalla (`Geist Sans`, `Inter` o pila del sistema), combinada con `Geist Mono` para códigos de pedido, importes y teléfonos.

**Display Font:** `var(--font-sans)`, `Inter`, system-ui, sans-serif  
**Body Font:** `var(--font-sans)`, `Inter`, system-ui, sans-serif  
**Mono Font:** `var(--font-mono)`, ui-monospace, monospace  

**Character:** Tipografía neutra, con tracking ligeramente cerrado en titulares para ganar compacidad corporativa, y proporciones generosas en cuerpo para lectura sin esfuerzo.

### Hierarchy
- **Display** (Bold 700, `1.875rem` / 30px, line-height 1.2, tracking `-0.025em`): Títulos de página principales (`/pedidos`, `/dashboard`).
- **Headline** (Bold 700, `1.5rem` / 24px, line-height 1.25, tracking `-0.02em`): Cifras KPI y encabezados de sección.
- **Title** (Semibold 600, `1rem` / 16px, line-height 1.4, tracking `-0.01em`): Nombres de clientes, títulos de tarjetas y encabezados de diálogos.
- **Body** (Regular 400, `0.875rem` / 14px, line-height 1.5): Textos explicativos, contenido de mensajes y descripción de productos. Longitud óptima: 60–75 caracteres.
- **Label** (Semibold 600, `0.75rem` / 12px, tracking `0.02em`, uppercase en badges): Píldoras de estado, canales y títulos de columnas.
- **Code / Number** (Semibold 600, `0.8125rem` / 13px, tracking `0.01em`): Referencias `#ENC-...`, precios en euros e identificadores únicos.

---

## Layout

El layout prioriza la densidad informativa controlada y la separación nítida de zonas de trabajo:
- **Modelo Espacial**: Barra de navegación lateral fija en escritorio (`260px`), barra inferior de 64px en móviles con respeto estricto de `env(safe-area-inset-bottom)`.
- **Ancho Máximo**: Contenedor principal centrado a `max-w-7xl` con `p-4 md:p-8`.
- **Rejilla de Métricas**: 5 columnas en escritorio amplio (`lg:grid-cols-5`), adaptadas a 2 columnas en pantallas intermedias y móviles con `gap-3.5` (14px).
- **Rango de Espaciados**: Escala compacta basada en múltiplos de 4px (`xs: 4px`, `sm: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`).

---

## Elevation & Depth

Automata sigue una filosofía **plana y estratificada (Flat-layered)**. La profundidad no se finge mediante sombras tridimensionales pesadas, sino mediante contraste de capas claras y bordes limpios.

### Shadow Vocabulary
- **Flat Rest** (`box-shadow: none` / `border: 1px solid #E5E7EB`): Estado base de todas las tarjetas y paneles en reposo.
- **Card Subtle** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04)`): Micro-sombra perimetral para distinguir tarjetas sobre fondo `#F8FAFC`.
- **Hover Lift** (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07)`): Respuesta visual ligera al posar el cursor sobre tarjetas interactivas de pedidos.
- **Modal Overlay** (`box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1)`): Elevación máxima para diálogos flotantes sobre telón semitransparente `rgba(15, 23, 42, 0.4)`.

### Named Rules
**La Regla del Borde Sutil (The Subtle Border Rule).** Cada contenedor elevado o diferenciado debe estar delimitado por un borde sutil de 1px (`#E5E7EB`). Queda prohibido depender exclusivamente de una sombra difusa para delimitar un componente sobre fondo blanco.

---

## Shapes

- **Esquinas Exteriores de Tarjetas**: `12px` (`rounded-xl` / `rounded-2xl` para contenedores hero). Equilibrio perfecto entre modernidad amigable y seriedad comercial.
- **Esquinas de Controles y Botones**: `8px` (`rounded-lg`). Proporciona una silueta táctil compacta.
- **Píldoras y Badges de Estado**: `9999px` (`rounded-full`). Contraste de geometría frente a las tarjetas cuadradas para señalar metadatos de un vistazo.
- **Contornos**: Borde perimetral uniforme de 1px sin biseles ni cortes asimétricos.

---

## Components

### Buttons
- **Shape**: `rounded-lg` (8px).
- **Primary Action**: Fondo `#2563EB`, texto blanco `#FFFFFF`, tipografía `font-semibold text-xs` (o `text-sm`), padding `px-4 py-2`. Hover `#1D4ED8` con transición fluida de color (150ms).
- **Secondary / Outline**: Fondo `#FFFFFF`, borde `1px solid #E5E7EB`, texto `#334155`, hover `bg-slate-50`.
- **Destructive / Reject**: Fondo transparente o `#FFF1F2`, borde `1px solid #FECDD3`, texto `#E11D48`, hover `bg-rose-100/50`.

### Status & Channel Badges
- **Shape**: `rounded-md` o `rounded-full` con padding horizontal `px-2.5 py-0.5`.
- **Estructura**: Borde de 1px a tono con el texto, tamaño de texto `text-xs font-semibold` o `font-bold`. Punto pulsante opcional (`w-1.5 h-1.5 rounded-full`) en pedidos pendientes que requieren atención inmediata.

### Cards & Rows
- **Estructura**: Fondo blanco puro (`#FFFFFF`), borde perimetral `#E5E7EB`, padding interno `p-5`.
- **Filas de Pedido**: Disposición tripartita: (1) Identificación de cliente y canal a la izquierda, (2) resumen de productos y total al centro, (3) botones de acción rápida a la derecha.

### Inputs & Fields
- **Estilo**: Fondo `#F8FAFC` o `#FFFFFF`, borde `#E5E7EB`, padding `px-3 py-2`, esquinas `rounded-lg`.
- **Focus Ring**: `ring-2 ring-blue-500/20 border-blue-500` sin halo de color invasivo.

---

## Do's and Don'ts

### Do:
- **Do** utilizar exclusivamente el fondo `#F8FAFC` con tarjetas en blanco `#FFFFFF` y bordes `#E5E7EB`.
- **Do** formatear todos los precios en euros con tipografía monoespaciada o negrita (`18,50 €`).
- **Do** incluir acceso directo con un clic al WhatsApp del cliente (`wa.me`) con mensaje contextualizado.
- **Do** asegurar que cualquier texto secundario use como mínimo `text-slate-500` (`#64748B`) para garantizar contraste WCAG AA.
- **Do** hablar en términos de tienda real: pedidos, clientes, catálogo, ventas y entregas.

### Don't:
- **Don't** reintroducir Dark Mode, fondos negros o grises apagados no autorizados.
- **Don't** emplear degradados violetas o púrpuras para elementos del sistema ("AI slop").
- **Don't** utilizar bordes laterales gruesos asimétricos (`border-l-4`) en las tarjetas de lista.
- **Don't** aplicar animaciones elásticas o saltarinas (`animate-bounce`); utilizar desaceleración suave y progresiva.
- **Don't** mostrar términos técnicos como "tokens", "embeddings", "vectorial" o "LLM" al comerciante.
