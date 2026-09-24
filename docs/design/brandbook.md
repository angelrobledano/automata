# Brandbook: Automata (Modern Clean SaaS Style para E-commerce)

## Filosofía Visual (Claridad y Usabilidad Comercial)
Automata es una herramienta profesional y directa, diseñada para **comerciantes, dueños de tiendas online y negocios locales**, no para ingenieros. La interfaz transmite confianza, luminosidad, orden y agilidad operativa:
- **Fondo Claro Principal (Light Mode First)**: `#F8FAFC` (`slate-50`). Proporciona máxima legibilidad, aspecto limpio y profesional adecuado para entornos de oficina o mostrador.
- **Tarjetas y Elevación Nítida**: Fondos en blanco puro (`#FFFFFF`) con bordes sutiles de 1px (`#E5E7EB` / `slate-200`) y sombras microscópicas (`shadow-xs` / `shadow-sm`). Sin sombras pesadas ni degradados invasivos.
- **Menos es Más (Foco en Ventas y Pedidos)**: Eliminación radical de ruido visual y métricas de vanidad. El comerciante debe ver sus pedidos pendientes, su facturación y las alertas que requieren respuesta humana de un solo vistazo.

## Tipografía (Geist / Inter)
- **Cuerpo (Body)**: 13px - 14px, color de alto contraste suave (`text-slate-600` o `#475569`). Altamente legible para revisar historiales de chat y listas de pedidos.
- **Títulos (Headings)**: Font weight `bold` o `semibold`. Color oscuro profundo (`text-slate-900` o `#0F172A`).
- **Monospace (Uso Restringido)**: Exclusivamente para identificadores de pedido (`#1044`), teléfonos o importes numéricos.

## Color de Acento (El "Commerce Blue")
- **Valor Canónico**: `#2563EB` (`blue-600`) con hover en `#1D4ED8` (`blue-700`) y fondos activos suaves en `#EFF6FF` (`blue-50`).
- **Uso Estricto (Llamados a la Acción)**: Reservado para botones principales de conversión ("Guardar Cambios", "Nuevo Pedido", "Conectar WhatsApp"), enlaces activos y badges de estado operando correctamente.
- **Prohibido**: No usar azul de acento en fondos de secciones completas ni en textos largos.

## Layout Canónico & Spacing
- **Estructura Respirada**: Separaciones generosas (`space-y-6`, `gap-6`) para que la interfaz no resulte abrumadora ni densa.
- **Radios de Borde (Border Radius)**:
  - Botones y campos de formulario: `8px` (`rounded-lg` / `rounded-md`).
  - Tarjetas y contenedores: `12px` (`rounded-xl`).
  - Evitar elementos en forma de píldora extrema (`rounded-full`) en botones primarios.

## Interacciones y Estados
- **Transiciones**: Rápidas y fluidas (`transition-all duration-150 ease-out`).
- **Focus / Ring**: Anillo sutil de foco azul (`focus:ring-2 focus:ring-blue-600 focus:border-transparent`).
- **Estados de Carga**: Skeletons suaves y pulcros con texto informativo ("Cargando tus pedidos..."), evitando spinners circulares técnicos.

