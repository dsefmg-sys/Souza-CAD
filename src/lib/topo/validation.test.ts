import { describe, it, expect } from 'vitest';
import { cpfValido } from './validation';

describe('cpfValido', () => {
  it('valida CPFs corretos', () => {
    // CPFs gerados aleatoriamente válidos para teste
    expect(cpfValido('111.444.777-35')).toBe(true);
    expect(cpfValido('11144477735')).toBe(true);
    expect(cpfValido('529.982.247-25')).toBe(true);
  });

  it('detecta CPFs inválidos', () => {
    expect(cpfValido('111.444.777-36')).toBe(false);
    expect(cpfValido('12345678900')).toBe(false);
    expect(cpfValido('000.000.000-00')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('abc')).toBe(false);
    expect(cpfValido('')).toBe(false);
  });
});
