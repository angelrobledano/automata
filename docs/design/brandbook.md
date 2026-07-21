# Brandbook: Automata (Linear / Polar.sh Style adaptado a E-commerce)

## Filosofía Visual (Elegancia Accesible)
Automata es una herramienta profesional y potente, pero diseñada para **comerciantes y dueños de negocio**, no para ingenieros. La interfaz debe transmitir confianza, claridad, modernidad y facilidad de uso, eliminando cualquier sensación de complejidad técnica.
- **Fondo Oscuro Profundo (Dark Mode First)**: Casi negro. Aporta un toque premium y moderno, reduciendo la fatiga visual.
- **Contraste Sutil pero Claro**: Los elementos se diferencian por ligeros cambios de elevación (fondos ligeramente más claros y bordes sutiles de 1px). Las divisiones deben ser evidentes para guiar al usuario sin abrumarlo con sombras.
- **Menos es Más (Foco en el Negocio)**: Eliminación radical de ruido visual. Si un elemento no ayuda al comerciante a vender más o entender su estado, se oculta o se simplifica.

## Tipografía (Geist / Inter)
- **Cuerpo (Body)**: 14px, opacidad moderada (`text-slate-400` o token equivalente). Debe ser sumamente legible para leer largas listas de pedidos o instrucciones.
- **Títulos (Headings)**: Font weight `semibold` o `medium`. Nunca súper gruesos. Color casi blanco (`text-slate-100`). Deben guiar al usuario amigablemente por cada sección.
- **Monospace (Uso Restringido)**: Solo para métricas clave o códigos de pedido. Evitar usar tipografías que parezcan "código de programación" en zonas donde el usuario espera lenguaje de negocio.

## Color de Acento (El "Polar Blue")
- **Valor Canónico**: `#0066FF` (Azul Eléctrico). Transmite seguridad, tecnología amigable y acción directa.
- **Uso Estricto (Llamados a la Acción)**: Única y exclusivamente para botones clave ("Conectar WhatsApp", "Guardar Cambios"), enlaces activos, o indicadores de éxito (el agente está funcionando). 
- **Prohibido**: No usar el color de acento en fondos grandes o de forma decorativa, ya que diluye la importancia de las acciones que el usuario debe tomar.

## Layout Canónico & Spacing ("Respiración Visual")
- **Espacio Negativo**: Deja que los elementos respiren. Márgenes enormes entre secciones (`gap-16`, `gap-24`) para que el usuario no sienta claustrofobia técnica.
- **Densidad Controlada**: Las tablas de métricas e inbox deben estar organizadas para leerse de un vistazo. 
- **Radios de Borde (Border Radius)**:
  - Botones y campos de texto: `4px` o `6px` (limpios y modernos).
  - Tarjetas y contenedores: `8px` o `12px` (suavidad estructural).

## Interacciones y Estado (Empatía Visual)
- **Hovers (Estados de paso)**: Suaves y rápidos (`transition-all duration-150`). Los elementos deben responder al ratón para confirmar que son interactivos, dando seguridad al usuario de que "el sistema responde".
- **Bordes Activos (Ring)**: Al hacer clic en un campo de texto, usar un anillo sutil de color de acento (`#0066FF`) para enfocar la atención sin estridencias.
- **Estados de Carga**: Usar esqueletos (skeletons) suaves en lugar de "spinners" técnicos, acompañados de mensajes cercanos como "Preparando tu asistente...".
