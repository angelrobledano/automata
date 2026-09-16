# Especificación de Diseño: Horarios Comerciales y Alertas en Tiempo Real de Pedidos

**Fecha:** 2026-09-16  
**Estado:** Aprobado en brainstorming / Pendiente de plan de implementación  
**Alcance:** `agente-pedidos` (Backend y Worker) y `dashboard` (Frontend)

---

## 1. Contexto y Objetivos

Automata gestiona pedidos automatizados de clientes a través de WhatsApp integrados con tiendas físicas locales, WooCommerce y Shopify. Actualmente se identificaron dos carencias operativas prioritarias:

1. **Falta de aviso inmediato en tienda:** Cuando un cliente completa un pedido vía WhatsApp, el comerciante o el personal de cocina/mostrador no se entera a menos que tenga la pantalla de `/pedidos` abierta y recargue manualmente.
2. **Atención descontrolada fuera de horario:** El bot procesa y confirma pedidos de madrugada o en días de cierre sin alertar al cliente del horario de apertura, generando falsas expectativas de entrega inmediata.

### Objetivos Principales
* Permitir al comerciante configurar su **horario semanal de apertura/cierre** (por días y turnos) con soporte de zona horaria local.
* Modificar la lógica del **Worker/Bot** para que, si el local está cerrado, avise amablemente al cliente de cuándo vuelve a abrir, tome el pedido como **diferido/programado** e incluya la advertencia de contacto en caso de incidencias de stock.
* Retransmitir al instante la creación de cualquier pedido mediante **Redis + Socket.io** a la pantalla `/pedidos`.
* Añadir un **timbre sonoro sintetizado nativo (Web Audio API)** y un distintivo visual claro para pedidos recibidos fuera de horario.

---

## 2. Modelo de Datos y Contratos de Interfaz

### 2.1. Estructura del Horario Semanal (`WeeklySchedule`)
El campo `businessHours` en la tabla `Commerce` almacenará una estructura JSON serializada:

```typescript
export interface TimeSlot {
  open: string;  // Formato "HH:mm" (24h), ej. "09:00"
  close: string; // Formato "HH:mm" (24h), ej. "14:00"
}

export interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[]; // Permite hasta 2 franjas (ej. turno mañana y turno tarde)
}

export interface WeeklySchedule {
  enabled: boolean;
  timezone: string; // IANA timezone, ej. "Europe/Madrid", "America/Bogota"
  days: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
}
```

### 2.2. Contrato del Evaluador de Horarios (`BusinessStatus`)
Función pura `getBusinessStatus(schedule: WeeklySchedule | string | null, date?: Date): BusinessStatus`:

```typescript
export interface BusinessStatus {
  isOpen: boolean;
  nextOpeningText: string; // Ej: "hoy a las 17:00", "mañana a las 09:00", "el lunes a las 09:30"
  currentDay: string;      // "monday", "tuesday", etc.
  currentTime: string;     // "15:45"
}
```

### 2.3. Evento en Tiempo Real (`NewOrderEvent`)
Publicado en el canal Redis `order_events` y emitido por Socket.io como `new_order`:

```typescript
export interface NewOrderEventPayload {
  type: 'NEW_ORDER';
  commerceId: string;
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    total: number;
    itemsCount: number;
    status: string;
    isOutOfHours: boolean;
    nextOpeningText?: string;
    createdAt: string;
  };
}
```

---

## 3. Arquitectura y Componentes

### 3.1. Backend (`agente-pedidos`)

#### A. Utilidad de Horarios (`src/utils/businessHours.ts`)
* Valida el horario usando `Intl.DateTimeFormat` con la zona horaria del comercio para evitar desajustes provocados por la hora UTC del servidor.
* Si el JSON es nulo o `enabled: false`, devuelve `isOpen: true` (comportamiento fallback 24/7 seguro).
* Si está cerrado, itera de forma cíclica los próximos 7 días para encontrar el primer turno de apertura disponible y genera una descripción amigable en español.

#### B. Contexto del Agente y Worker (`src/worker.ts`)
* Antes de armar el `systemPrompt` para el modelo de lenguaje:
  * Ejecuta `getBusinessStatus(commerce.businessHours)`.
  * Si `isOpen === false`, inyecta la directiva:
    > `[ESTADO DEL LOCAL: CERRADO - Próxima apertura: ${nextOpeningText}]`  
    > `El establecimiento está cerrado en este momento. Si el cliente solicita un pedido, infórmale con amabilidad de que el local está cerrado pero que puedes dejar su pedido registrado para prepararlo en cuanto abra. Si confirma, tómale los datos y finaliza el pedido normalmente.`
* Mensaje final de confirmación de pedido fuera de horario:
  > *"¡Tu pedido ha quedado registrado con éxito! 🕒 Al haberlo realizado fuera de horario, nuestro equipo comenzará a prepararlo el [Día] a las [Hora]. Si hubiera algún problema de stock o disponibilidad, nos pondremos en contacto contigo inmediatamente al abrir. ¡Muchas gracias por tu compra!"*

#### C. Creación y Publicación del Pedido (`src/orders/*`)
* En `LocalOrderProvider`, `WooCommerceOrderProvider` y `ShopifyOrderProvider`:
  * Al persistir la orden en Prisma (`prisma.order.create`):
    * Se evalúa `isOutOfHours`.
    * Si es fuera de horario, se incluye en `notes`: `[FUERA DE HORARIO - Apertura: ${nextOpeningText}]`.
  * Se publica en Redis: `redisPub.publish('order_events', JSON.stringify(payload))`.

#### D. Servidor WebSockets (`src/index.ts`)
* El suscriptor de Redis escucha `order_events` y retransmite a través de `io.emit('new_order', payload)`.

---

### 3.2. Dashboard (`dashboard`)

#### A. Configuración de Horarios (`dashboard/src/app/ajustes/page.tsx`)
* Nueva sección interactiva en "Configuración del Comercio":
  * Selector de zona horaria con buscador.
  * Switch principal: "Habilitar control de horarios comerciales".
  * Tabla semanal (7 días) con:
    * Botón toggle "Abierto / Cerrado" por día.
    * Entradas de hora para Turno 1 (Apertura y Cierre).
    * Botón opcional "+ Añadir turno partido" (Turno 2).
  * Validación visual en tiempo real de que `open < close`.
  * Guardado asíncrono vía `PATCH /api/settings`.

#### B. Notificaciones en Tiempo Real y Timbre en `/pedidos` (`dashboard/src/app/pedidos/`)
* **Conexión Socket.io:**
  * Escucha de evento `new_order`.
  * Inserción instantánea del pedido en la lista local con animación suave sin recarga de página.
* **Alerta Sonora (Web Audio API):**
  * Sintetizador de sonido puro mediante `AudioContext`:
    * Nota 1: Frecuencia 587.33 Hz (D5) durante 150ms.
    * Nota 2: Frecuencia 880.00 Hz (A5) durante 350ms con decaimiento exponencial suave.
    * Cero dependencias de archivos `.mp3` externos (0 problemas de CORS, 0 errores 404).
* **Control de Silencio en la Barra de Herramientas:**
  * Botón accesible con icono de campana: `🔔 Alertas sonoras: Activas / Silenciadas`.
  * Persistencia de la preferencia en `localStorage.getItem('automata_order_sound_muted')`.
* **Insignia Visual en la Tabla de Pedidos:**
  * Pedidos normales: Badge estándar según estado (`Pendiente`, `Completado`).
  * Pedidos fuera de horario: Badge con tono ámbar sutil:  
    `🕒 Fuera de horario (Apertura: [Hora])`.

---

## 4. Gestión de Errores y Casos Límite

| Caso Límite | Comportamiento del Sistema |
| :--- | :--- |
| **Comercio sin horarios configurados (`null`)** | Se considera abierto 24/7 de forma predeterminada sin provocar errores ni excepciones. |
| **Horario partido (ej. 10:00-14:00 y 17:00-21:00)** | Si el cliente escribe a las 15:30, el sistema detecta correctamente que abre "hoy a las 17:00". |
| **Cierre de fin de semana (ej. Viernes noche)** | Detecta el próximo turno del Lunes y responde "abrimos el lunes a las 09:00". |
| **Política de Autoplay de Audio del Navegador** | El botón de activar/silenciar sonido desbloquea el `AudioContext` en el primer clic del usuario para evitar que Chrome/Edge bloqueen el sonido. |
| **Pérdida temporal de conexión Socket.io** | Reconexión automática nativa con reintento exponencial. Los pedidos ya cargados permanecen en pantalla. |

---

## 5. Plan de Verificación y Pruebas

1. **Pruebas Unitarias (`src/test/businessHours.test.ts`):**
   * Comprobar apertura en horario activo (retorna `isOpen: true`).
   * Comprobar cierre entre turnos de mediodía (retorna `isOpen: false, nextOpeningText: "hoy a las 17:00"`).
   * Comprobar cierre nocturno y fin de semana.
   * Manejo seguro de datos inválidos o vacíos.
2. **Pruebas de Integración:**
   * Simular creación de pedido en `LocalOrderProvider` y verificar emisión del evento en Redis y Socket.io.
   * Verificar que la nota `[FUERA DE HORARIO]` queda grabada en el pedido.
3. **Pruebas de Frontend:**
   * Verificar renderizado y persistencia de horarios en `/ajustes`.
   * Probar el sintetizador de sonido en `/pedidos` con el toggle de silencio.
   * Verificar la inserción reactiva de pedidos al recibir el evento de socket.
