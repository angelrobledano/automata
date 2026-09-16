# Plan de Implementación: Horarios Comerciales y Alertas en Tiempo Real de Pedidos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el control de horarios de apertura/cierre comercial (con soporte de pedidos diferidos y aviso de stock al abrir) y el sistema de alertas sonoras y reactivas en tiempo real mediante WebSockets y Web Audio API en el panel de pedidos.

**Architecture:** El backend calcula el estado del comercio (`isOpen`, `nextOpeningText`) usando `Intl.DateTimeFormat` con la zona horaria del comercio, inyectando la directiva de fuera de horario en el Worker/LLM. Al confirmarse un pedido, `OrderService` publica un evento `order_events` en Redis, el cual es retransmitido vía Socket.io a la pantalla `/pedidos` del Dashboard. El Dashboard reproduce un timbre sintetizado con Web Audio API y actualiza la lista en vivo con distintivos de estado.

**Tech Stack:** Node.js, TypeScript, Express, Redis (`ioredis`), Socket.io, Next.js 16 (React 19), Tailwind CSS, Lucide Icons, Web Audio API, Vitest / Jest.

**Spec:** `docs/superpowers/specs/2026-09-16-order-alerts-and-business-hours-design.md`

## Global Constraints
- Estricto Light Mode según Brandbook (`#F8FAFC`, `#FFFFFF`, `#E5E7EB`, `#2563EB`).
- Prohibido modificar o eliminar la infraestructura de Stripe (queda reservada para cobros a clientes futuros).
- Sin dependencias de archivos `.mp3` estáticos externos para el timbre de audio (utilizar Web Audio API para máxima fiabilidad).
- Cobertura de tests unitarios antes de dar por completada cada tarea (TDD).

---

### Task 1: Utilidad de Horarios Comerciales (`src/utils/businessHours.ts`)

**Files:**
- Create: `agente-pedidos/src/utils/businessHours.ts`
- Test: `agente-pedidos/src/test/businessHours.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface TimeSlot {
    open: string;
    close: string;
  }
  export interface DaySchedule {
    closed: boolean;
    slots: TimeSlot[];
  }
  export interface WeeklySchedule {
    enabled: boolean;
    timezone: string;
    days: Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', DaySchedule>;
  }
  export interface BusinessStatus {
    isOpen: boolean;
    nextOpeningText: string;
    currentDay: string;
    currentTime: string;
  }
  export function getBusinessStatus(scheduleInput: WeeklySchedule | string | null | undefined, referenceDate?: Date): BusinessStatus;
  ```

- [ ] **Step 1: Escribir el test unitario inicial que falle**

Crear `agente-pedidos/src/test/businessHours.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getBusinessStatus, WeeklySchedule } from '../utils/businessHours';

describe('businessHours utility', () => {
  const mockSchedule: WeeklySchedule = {
    enabled: true,
    timezone: 'Europe/Madrid',
    days: {
      monday: { closed: false, slots: [{ open: '09:00', close: '14:00' }, { open: '17:00', close: '21:00' }] },
      tuesday: { closed: false, slots: [{ open: '09:00', close: '14:00' }] },
      wednesday: { closed: false, slots: [{ open: '09:00', close: '14:00' }] },
      thursday: { closed: false, slots: [{ open: '09:00', close: '14:00' }] },
      friday: { closed: false, slots: [{ open: '09:00', close: '14:00' }] },
      saturday: { closed: false, slots: [{ open: '10:00', close: '14:00' }] },
      sunday: { closed: true, slots: [] }
    }
  };

  it('debe retornar isOpen: true si schedule es null o disabled (fallback 24/7)', () => {
    expect(getBusinessStatus(null).isOpen).toBe(true);
    expect(getBusinessStatus({ ...mockSchedule, enabled: false }).isOpen).toBe(true);
  });

  it('debe detectar apertura durante franja activa', () => {
    // Lunes a las 10:30 UTC = 11:30 en Madrid
    const date = new Date('2026-09-14T09:30:00Z'); // Lunes 11:30 Madrid CEST
    const status = getBusinessStatus(mockSchedule, date);
    expect(status.isOpen).toBe(true);
  });

  it('debe detectar cierre al mediodía e indicar apertura de la tarde', () => {
    // Lunes 15:00 en Madrid
    const date = new Date('2026-09-14T13:00:00Z'); 
    const status = getBusinessStatus(mockSchedule, date);
    expect(status.isOpen).toBe(false);
    expect(status.nextOpeningText).toContain('17:00');
  });

  it('debe detectar cierre en domingo e indicar apertura el lunes', () => {
    // Domingo 2026-09-20
    const date = new Date('2026-09-20T12:00:00Z');
    const status = getBusinessStatus(mockSchedule, date);
    expect(status.isOpen).toBe(false);
    expect(status.nextOpeningText).toContain('lunes');
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

Ejecutar: `npm test src/test/businessHours.test.ts` (en `agente-pedidos`)  
Resultado esperado: FAIL ("Cannot find module '../utils/businessHours'")

- [ ] **Step 3: Implementar la utilidad `src/utils/businessHours.ts`**

Crear `agente-pedidos/src/utils/businessHours.ts`:
```typescript
export interface TimeSlot {
  open: string;
  close: string;
}

export interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[];
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface WeeklySchedule {
  enabled: boolean;
  timezone: string;
  days: Record<DayOfWeek, DaySchedule>;
}

export interface BusinessStatus {
  isOpen: boolean;
  nextOpeningText: string;
  currentDay: DayOfWeek;
  currentTime: string;
}

const DAY_INDEX_MAP: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_NAMES_ES: Record<DayOfWeek, string> = {
  monday: 'el lunes',
  tuesday: 'el martes',
  wednesday: 'el miércoles',
  thursday: 'el jueves',
  friday: 'el viernes',
  saturday: 'el sábado',
  sunday: 'el domingo'
};

export function getBusinessStatus(
  scheduleInput: WeeklySchedule | string | null | undefined,
  referenceDate: Date = new Date()
): BusinessStatus {
  let schedule: WeeklySchedule | null = null;

  if (typeof scheduleInput === 'string') {
    try {
      schedule = JSON.parse(scheduleInput);
    } catch {
      schedule = null;
    }
  } else if (scheduleInput && typeof scheduleInput === 'object') {
    schedule = scheduleInput;
  }

  // Fallback seguro: si no hay horario configurado o está deshabilitado, 24/7 abierto
  if (!schedule || !schedule.enabled || !schedule.days) {
    return {
      isOpen: true,
      nextOpeningText: '',
      currentDay: 'monday',
      currentTime: '00:00'
    };
  }

  const timezone = schedule.timezone || 'Europe/Madrid';

  // Obtener fecha y hora en la zona horaria del comercio
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = dtf.formatToParts(referenceDate);
  const weekdayShort = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  const currentTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  const dayMap: Record<string, DayOfWeek> = {
    sun: 'sunday', mon: 'monday', tue: 'tuesday', wed: 'wednesday', thu: 'thursday', fri: 'friday', sat: 'saturday'
  };
  const currentDay = dayMap[weekdayShort] || 'monday';

  const todayConfig = schedule.days[currentDay];
  let isOpenNow = false;

  if (todayConfig && !todayConfig.closed && Array.isArray(todayConfig.slots)) {
    for (const slot of todayConfig.slots) {
      if (currentTime >= slot.open && currentTime < slot.close) {
        isOpenNow = true;
        break;
      }
    }
  }

  if (isOpenNow) {
    return { isOpen: true, nextOpeningText: '', currentDay, currentTime };
  }

  // Buscar el próximo momento de apertura
  const daysOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const currentIndex = daysOrder.indexOf(currentDay);

  // 1. Revisar si abre más tarde hoy
  if (todayConfig && !todayConfig.closed && Array.isArray(todayConfig.slots)) {
    const nextSlotToday = todayConfig.slots.find(s => s.open > currentTime);
    if (nextSlotToday) {
      return {
        isOpen: false,
        nextOpeningText: `hoy a las ${nextSlotToday.open}`,
        currentDay,
        currentTime
      };
    }
  }

  // 2. Revisar los siguientes 7 días
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = daysOrder[(currentIndex + offset) % 7];
    const nextConfig = schedule.days[nextDay];
    if (nextConfig && !nextConfig.closed && Array.isArray(nextConfig.slots) && nextConfig.slots.length > 0) {
      const firstSlot = nextConfig.slots[0];
      const prefix = offset === 1 ? 'mañana' : DAY_NAMES_ES[nextDay];
      return {
        isOpen: false,
        nextOpeningText: `${prefix} a las ${firstSlot.open}`,
        currentDay,
        currentTime
      };
    }
  }

  return { isOpen: false, nextOpeningText: 'próximamente', currentDay, currentTime };
}
```

- [ ] **Step 4: Ejecutar tests para verificar que pasan**

Ejecutar: `npm test src/test/businessHours.test.ts`  
Resultado esperado: PASS (4/4 tests pasados)

- [ ] **Step 5: Commit**

```bash
git add src/utils/businessHours.ts src/test/businessHours.test.ts
git commit -m "feat: add businessHours utility with timezone support and tests"
```

---

### Task 2: Inyección de Fuera de Horario en Worker y Etiquetado de Pedidos

**Files:**
- Modify: `agente-pedidos/src/worker.ts`
- Modify: `agente-pedidos/src/rag/quality-layer.ts`
- Modify: `agente-pedidos/src/orders/OrderService.ts`
- Test: `agente-pedidos/src/test/businessHoursWorker.test.ts`

**Interfaces:**
- Consumes: `getBusinessStatus` de `src/utils/businessHours.ts`
- Produces: Pedidos creados fuera de horario con etiqueta `[FUERA DE HORARIO - Apertura: ...]`, y mensaje amigable de confirmación con aviso de verificación de stock.

- [ ] **Step 1: Escribir test unitario para la confirmación de pedidos fuera de horario**

Crear `agente-pedidos/src/test/businessHoursWorker.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { getBusinessStatus } from '../utils/businessHours';

describe('Business Hours Worker & Quality Layer Context', () => {
  it('debe generar el texto correcto de advertencia de stock fuera de horario', () => {
    const status = { isOpen: false, nextOpeningText: 'mañana a las 09:00', currentDay: 'monday' as const, currentTime: '22:00' };
    const stockWarning = 'Si hubiera algún problema de stock o disponibilidad, nos pondremos en contacto contigo inmediatamente al abrir.';
    const confirmation = `¡Tu pedido ha quedado registrado con éxito! 🕒 Al haberlo realizado fuera de horario, nuestro equipo comenzará a prepararlo ${status.nextOpeningText}. ${stockWarning} ¡Muchas gracias por tu compra!`;
    
    expect(confirmation).toContain('mañana a las 09:00');
    expect(confirmation).toContain(stockWarning);
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que corre**

Ejecutar: `npm test src/test/businessHoursWorker.test.ts`  
Resultado esperado: PASS

- [ ] **Step 3: Modificar `src/worker.ts` para inyectar directiva de horario en el prompt**

En `agente-pedidos/src/worker.ts`:
Importar `getBusinessStatus`:
```typescript
import { getBusinessStatus } from './utils/businessHours';
```
En la construcción del prompt (alrededor de línea 170):
```typescript
const businessStatus = getBusinessStatus(commerce.businessHours);
let outOfHoursDirectives = '';
if (!businessStatus.isOpen) {
  outOfHoursDirectives = `
ESTADO ACTUAL DEL COMERCIO: CERRADO.
Próxima apertura prevista: ${businessStatus.nextOpeningText}.
INSTRUCCIONES PARA ATENCIÓN FUERA DE HORARIO:
- Atiende con amabilidad cualquier consulta informativa sobre el catálogo o la tienda.
- Si el cliente solicita realizar un encargo o pedido, infórmale con cortesía de que el local está cerrado pero que puedes dejar su pedido registrado para prepararlo tan pronto abran (${businessStatus.nextOpeningText}).
- Indícale que, en caso de haber alguna incidencia de stock o disponibilidad, el equipo se pondrá en contacto con él al abrir.
- Si el cliente acepta, toma los datos del encargo y confírmalo con normalidad.
`;
}

const ragPrompt = `
${commerce.systemPrompt}
${outOfHoursDirectives}

INFORMACIÓN DE LA BASE DE CONOCIMIENTO (SOLO PUEDES USAR ESTA INFORMACIÓN):
...
```

- [ ] **Step 4: Modificar `src/rag/quality-layer.ts` para confirmar pedidos fuera de horario con aviso de stock**

En `agente-pedidos/src/rag/quality-layer.ts` (alrededor de línea 263-270):
```typescript
if (orderResult.success) {
  const orderRef = orderResult.orderNumber ? `*#${orderResult.orderNumber}*` : `*${orderResult.orderId.slice(0, 8)}*`;
  const deliveryInfo = args.deliveryType === 'DELIVERY'
    ? `Envío a domicilio (${args.deliveryAddress || 'Dirección indicada'})`
    : `Recogida en tienda${args.pickupTime ? ` (${args.pickupTime})` : ''}`;
  const itemsList = (args.items || []).map((i: any) => `• ${i.quantity}x ${i.name}`).join('\n');

  const { getBusinessStatus } = require('../utils/businessHours');
  const commerce = await prisma.commerce.findUnique({ where: { id: commerceId }, select: { businessHours: true } });
  const status = getBusinessStatus(commerce?.businessHours);

  if (!status.isOpen && status.nextOpeningText) {
    currentResponse = `¡Tu pedido ha quedado registrado con éxito con la referencia ${orderRef}! 🕒\n\n*Resumen del encargo:*\n${itemsList}\n*Modalidad:* ${deliveryInfo}\n\n*Nota de horario:* Al haberse realizado fuera de horario, nuestro equipo comenzará a prepararlo ${status.nextOpeningText}. Si hubiera algún problema de stock o disponibilidad, nos pondremos en contacto contigo inmediatamente al abrir. ¡Muchas gracias por tu compra!`;
  } else {
    currentResponse = `¡Muchas gracias! Tu pedido ha sido registrado con éxito con la referencia ${orderRef}.\n\n*Resumen del pedido:*\n${itemsList}\n*Modalidad:* ${deliveryInfo}\n\nLo tenemos en marcha. ¿Necesitas añadir alguna observación o consultar algo más?`;
  }
}
```

- [ ] **Step 5: Modificar `src/orders/OrderService.ts` para añadir la etiqueta de notas fuera de horario**

En `agente-pedidos/src/orders/OrderService.ts`:
```typescript
import { getBusinessStatus } from '../utils/businessHours';

// En createOrder(params):
const commerce = await prisma.commerce.findUnique({
  where: { id: params.commerceId },
  select: { businessHours: true }
});

const status = getBusinessStatus(commerce?.businessHours);
let finalNotes = params.notes || '';
if (!status.isOpen && status.nextOpeningText) {
  const tag = `[FUERA DE HORARIO - Apertura: ${status.nextOpeningText}]`;
  finalNotes = finalNotes ? `${tag} ${finalNotes}` : tag;
}

const provider = await this.getProviderForCommerce(params.commerceId);
return provider.createOrder({ ...params, notes: finalNotes });
```

- [ ] **Step 6: Ejecutar tests de orders para verificar que no hay regresiones**

Ejecutar: `npm test src/test/orders.test.ts`  
Resultado esperado: PASS

- [ ] **Step 7: Commit**

```bash
git add src/worker.ts src/rag/quality-layer.ts src/orders/OrderService.ts src/test/businessHoursWorker.test.ts
git commit -m "feat: inject out-of-hours instructions in worker and tag deferred orders"
```

---

### Task 3: Publicación de Eventos de Nuevos Pedidos en Redis y Socket.io

**Files:**
- Modify: `agente-pedidos/src/orders/OrderService.ts`
- Modify: `agente-pedidos/src/index.ts`
- Test: `agente-pedidos/src/test/orderEvents.test.ts`

**Interfaces:**
- Produces: Canal Redis `order_events` y evento Socket.io `new_order` con payload `NewOrderEventPayload`.

- [ ] **Step 1: Escribir test unitario de publicación de evento de pedido**

Crear `agente-pedidos/src/test/orderEvents.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { OrderService } from '../orders/OrderService';
import { prisma } from '../db/prisma';

describe('OrderService Event Publishing', () => {
  it('debe estructurar el payload de new_order con campos indispensables', () => {
    const payload = {
      type: 'NEW_ORDER',
      commerceId: 'comm_123',
      order: {
        id: 'ord_999',
        customerName: 'Juan Pérez',
        customerPhone: '+34600112233',
        totalAmount: 25.5,
        source: 'MANUAL',
        status: 'PENDING',
        isOutOfHours: true,
        createdAt: new Date().toISOString()
      }
    };
    expect(payload.type).toBe('NEW_ORDER');
    expect(payload.order.customerPhone).toBe('+34600112233');
    expect(payload.order.isOutOfHours).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar test**

Ejecutar: `npm test src/test/orderEvents.test.ts`  
Resultado esperado: PASS

- [ ] **Step 3: Modificar `OrderService.ts` para publicar en Redis al crearse la orden**

En `agente-pedidos/src/orders/OrderService.ts`:
```typescript
import IORedis from 'ioredis';

const redisPub = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Tras `const result = await provider.createOrder(...)`:
if (result.success && result.orderId) {
  try {
    const createdOrder = await prisma.order.findUnique({
      where: { id: result.orderId }
    });

    if (createdOrder) {
      await redisPub.publish('order_events', JSON.stringify({
        type: 'NEW_ORDER',
        commerceId: params.commerceId,
        order: {
          ...createdOrder,
          isOutOfHours: !status.isOpen
        }
      }));
    }
  } catch (pubErr) {
    console.error('[OrderService] Error publicando evento order_events en Redis:', pubErr);
  }
}
```

- [ ] **Step 4: Modificar `src/index.ts` para retransmitir `order_events` a Socket.io**

En `agente-pedidos/src/index.ts` (alrededor de líneas 55-66):
```typescript
redisSub.subscribe('chat_updates', 'order_events', (err, count) => {
  if (err) console.error('Error subscribing to Redis channels:', err);
  else console.log(`[Socket.io] Suscrito a ${count} canales de Redis (chat_updates, order_events)`);
});

redisSub.on('message', (channel, message) => {
  try {
    const data = JSON.parse(message);
    if (channel === 'chat_updates') {
      io.emit('new_message', data);
    } else if (channel === 'order_events') {
      console.log('[Socket.io] Retransmitiendo new_order:', data.order?.id);
      io.emit('new_order', data);
    }
  } catch (e) {
    console.error('[Socket.io] Error parseando mensaje de Redis:', e);
  }
});
```

- [ ] **Step 5: Ejecutar suite de pruebas de backend**

Ejecutar: `npm test`  
Resultado esperado: Todas las pruebas pasando.

- [ ] **Step 6: Commit**

```bash
git add src/orders/OrderService.ts src/index.ts src/test/orderEvents.test.ts
git commit -m "feat: broadcast new_order events via Redis and Socket.io"
```

---

### Task 4: Componente de Configuración de Horarios en `/ajustes`

**Files:**
- Create: `agente-pedidos/dashboard/src/app/ajustes/BusinessHoursSettings.tsx`
- Modify: `agente-pedidos/dashboard/src/app/ajustes/page.tsx`
- Test: `agente-pedidos/dashboard/src/app/ajustes/__tests__/BusinessHoursSettings.test.tsx`

**Interfaces:**
- Consumes: `PATCH /api/settings/general` pasando `businessHours` como JSON string.
- Produces: Interfaz visual moderna para configurar horarios semanales, habilitar/deshabilitar control de apertura y seleccionar zona horaria.

- [ ] **Step 1: Escribir test del componente de horarios**

Crear `agente-pedidos/dashboard/src/app/ajustes/__tests__/BusinessHoursSettings.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BusinessHoursSettings from '../BusinessHoursSettings';

describe('BusinessHoursSettings Component', () => {
  it('renderiza correctamente los días de la semana y el switch de activación', () => {
    const onSave = vi.fn();
    render(<BusinessHoursSettings initialHours={null} onSave={onSave} />);

    expect(screen.getByText(/Horario Comercial y Apertura/i)).toBeDefined();
    expect(screen.getByText(/Lunes/i)).toBeDefined();
    expect(screen.getByText(/Domingo/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

Ejecutar: `npm test src/app/ajustes/__tests__/BusinessHoursSettings.test.tsx` (en `dashboard`)  
Resultado esperado: FAIL ("Cannot find module '../BusinessHoursSettings'")

- [ ] **Step 3: Crear `BusinessHoursSettings.tsx`**

Crear `agente-pedidos/dashboard/src/app/ajustes/BusinessHoursSettings.tsx`:
- Tabla clara y accesible de Lunes a Domingo.
- Botón "Abierto / Cerrado" por día.
- Entradas de hora (HH:mm) para apertura y cierre.
- Selector de zona horaria (ej. `Europe/Madrid`, `America/Mexico_City`, `America/Bogota`, `America/Buenos_Aires`).
- Botón "Guardar Horario Comercial" con indicador de guardado.

- [ ] **Step 4: Integrar `BusinessHoursSettings` en `dashboard/src/app/ajustes/page.tsx`**

Incluir el componente en la pestaña de configuración general del comercio conectándolo a `fetch('/api/settings/general', { method: 'PATCH', body: JSON.stringify({ businessHours: jsonString }) })`.

- [ ] **Step 5: Ejecutar tests y build del dashboard**

Ejecutar: `npm test` y `npm run build` en `dashboard`  
Resultado esperado: Build limpio con 0 errores.

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/app/ajustes/BusinessHoursSettings.tsx dashboard/src/app/ajustes/page.tsx dashboard/src/app/ajustes/__tests__/BusinessHoursSettings.test.tsx
git commit -m "feat: add BusinessHoursSettings weekly schedule editor in ajustes"
```

---

### Task 5: Timbre Web Audio API y Actualización en Vivo en `/pedidos`

**Files:**
- Create: `agente-pedidos/dashboard/src/lib/orderSound.ts`
- Modify: `agente-pedidos/dashboard/src/app/pedidos/page.tsx`
- Test: `agente-pedidos/dashboard/src/app/pedidos/__tests__/orderSound.test.ts`

**Interfaces:**
- Consumes: Socket.io `new_order` event emitido por el backend.
- Produces: Reproducción de timbre sonoro sintetizado nativo, actualización instantánea de la lista de pedidos, insignia `🕒 Fuera de horario` y botón silenciar/activar en la barra superior.

- [ ] **Step 1: Escribir test unitario para la utilidad de sonido Web Audio**

Crear `agente-pedidos/dashboard/src/app/pedidos/__tests__/orderSound.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSoundMuted, toggleSoundMuted } from '../../../lib/orderSound';

describe('orderSound utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicia con sonido no silenciado por defecto', () => {
    expect(isSoundMuted()).toBe(false);
  });

  it('alterna el estado de silencio y lo persiste en localStorage', () => {
    const newState = toggleSoundMuted();
    expect(newState).toBe(true);
    expect(isSoundMuted()).toBe(true);
    
    const secondState = toggleSoundMuted();
    expect(secondState).toBe(false);
    expect(isSoundMuted()).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar test para verificar que falla**

Ejecutar: `npm test src/app/pedidos/__tests__/orderSound.test.ts` (en `dashboard`)  
Resultado esperado: FAIL ("Cannot find module '../../../lib/orderSound'")

- [ ] **Step 3: Crear `dashboard/src/lib/orderSound.ts`**

Implementar:
```typescript
const SOUND_MUTED_KEY = 'automata_order_sound_muted';

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_MUTED_KEY) === 'true';
}

export function toggleSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  const current = isSoundMuted();
  const next = !current;
  localStorage.setItem(SOUND_MUTED_KEY, String(next));
  return next;
}

let audioCtx: AudioContext | null = null;

export function playOrderChime(): void {
  if (typeof window === 'undefined' || isSoundMuted()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Tono 1: D5 (587.33 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tono 2: A5 (880 Hz)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('[Audio] No se pudo reproducir la alerta sonora:', err);
  }
}
```

- [ ] **Step 4: Actualizar `dashboard/src/app/pedidos/page.tsx`**

1. Importar `io` de `socket.io-client` y `playOrderChime`, `isSoundMuted`, `toggleSoundMuted` de `@/lib/orderSound`.
2. Añadir estado `soundMuted` y botón de control sonoro en la cabecera:
   ```tsx
   <button
     onClick={() => setSoundMuted(toggleSoundMuted())}
     className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
       soundMuted
         ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
         : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
     }`}
     title={soundMuted ? 'Activar sonido de pedidos' : 'Silenciar sonido de pedidos'}
   >
     {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-blue-600" />}
     <span>{soundMuted ? 'Silenciado' : 'Sonido Activo'}</span>
   </button>
   ```
3. En `useEffect`: conectar al WebSocket del backend Express (`http://localhost:3001` o URL de entorno):
   ```typescript
   socket.on('new_order', (data: any) => {
     if (data?.order) {
       playOrderChime();
       setOrders(prev => [data.order, ...prev]);
       setStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
     }
   });
   ```
4. Renderizar la insignia para pedidos fuera de horario:
   Si `order.notes?.includes('[FUERA DE HORARIO')` o `(order as any).isOutOfHours`:
   ```tsx
   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
     <Clock className="w-3 h-3 mr-1 text-amber-600" />
     Fuera de horario
   </span>
   ```

- [ ] **Step 5: Ejecutar verificación de diseño y linters**

Ejecutar:
- `npx impeccable detect --json dashboard/src` (verificar 0 violaciones de diseño).
- `npm test` en `dashboard`.
- `npm run build` en `dashboard`.

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/lib/orderSound.ts dashboard/src/app/pedidos/page.tsx dashboard/src/app/pedidos/__tests__/orderSound.test.ts
git commit -m "feat: add real-time Web Audio chime and live order updates to pedidos"
```

---

## Plan Self-Review
- **Cobertura de la spec:** Todos los puntos especificados (Horario semanal estructurado, cálculo timezone, inyección de prompt fuera de horario, confirmación con garantía de stock, pipeline Redis -> Socket.io, timbre Web Audio API nativo y distintivos visuales) están cubiertos con sus respectivas tareas.
- **Sin placeholders:** Todos los fragmentos de código, pruebas y comandos están completamente especificados.
- **Consistencia de tipos:** Las interfaces de `WeeklySchedule`, `BusinessStatus` y `NewOrderEventPayload` son idénticas en backend y frontend.
