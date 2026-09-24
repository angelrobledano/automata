# Control de Calidad Visual: Lista de Revisión Antes de Publicar

Antes de dar por diseñada una nueva pantalla o sección del panel de control, revisa esta lista de forma manual. Si no cumples alguno de los puntos, ajusta el diseño para mantener la coherencia.

## 📋 Checklist de Revisión

- [ ] **Revisión de Color**: ¿Todos los colores utilizados forman parte de la paleta oficial clara (`#F8FAFC`, `#FFFFFF`, `#E5E7EB`, `#2563EB`)? Asegúrate de no inventar tonos nuevos ni añadir colores estridentes que rompan la armonía.
- [ ] **Revisión del Azul de Acción**: ¿El azul `#2563EB` (`blue-600`) se ha reservado para el botón principal de acción comercial ("Guardar", "Conectar", "Nuevo Pedido") o estados activos? Evita saturar la pantalla con azul en fondos o bordes no interactivos.
- [ ] **Revisión de Fondos y Tarjetas**: ¿El fondo de la pantalla es el gris claro oficial (`#F8FAFC` / `slate-50`) y las tarjetas son blanco puro (`#FFFFFF`) con bordes sutiles de 1px (`#E5E7EB`)?
- [ ] **Revisión de Esquinas (Bordes)**: ¿Los botones y campos usan radios modernos `rounded-lg` (8px) o `rounded-xl` (12px en tarjetas)? Evita botones deformados en píldora (`rounded-full`).
- [ ] **Revisión de Textos (Copy)**: ¿Se habla en el idioma del comerciante (pedidos, ventas, clientes, catálogo) eliminando tecnicismos como "tokens", "embeddings" o "sincronizando"?
- [ ] **Revisión de Jerarquía**: ¿El diseño guía el ojo del usuario de lo más importante a lo secundario? El título principal de la sección debe ser el elemento que más resalte, el texto explicativo debe ir en un gris suave (`slate-500` / `slate-600`), y los datos secundarios en un tamaño aún menor.
- [ ] **Revisión de Contraste y Sombras**: ¿Se utilizan sombras mínimas (`shadow-xs` / `shadow-sm`) y bordes claros, eliminando sombras difusas pesadas?

