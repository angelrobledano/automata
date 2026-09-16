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
    expect(status.nextOpeningText).toContain('mañana');
  });
});
