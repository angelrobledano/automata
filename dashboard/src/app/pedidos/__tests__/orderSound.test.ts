import { describe, it, expect, beforeEach } from 'vitest';
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
