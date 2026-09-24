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
    const nextDay = daysOrder[(currentIndex + offset) % 7]!;
    const nextConfig = schedule.days[nextDay];
    if (nextConfig && !nextConfig.closed && Array.isArray(nextConfig.slots) && nextConfig.slots.length > 0) {
      const firstSlot = nextConfig.slots[0]!;
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
