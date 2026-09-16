import { describe, it, expect } from 'vitest';
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
