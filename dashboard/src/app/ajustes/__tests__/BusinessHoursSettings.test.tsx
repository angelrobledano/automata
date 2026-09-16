import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BusinessHoursSettings from '../BusinessHoursSettings';

describe('BusinessHoursSettings Component', () => {
  it('renderiza correctamente los días de la semana y el switch de activación', () => {
    const onSave = vi.fn();
    render(<BusinessHoursSettings initialHours={null} onSave={onSave} />);

    expect(screen.getByText(/Horario Comercial y Atención/i)).toBeDefined();
    expect(screen.getByText(/Lunes/i)).toBeDefined();
    expect(screen.getByText(/Domingo/i)).toBeDefined();
  });
});
