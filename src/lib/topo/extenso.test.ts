import { describe, it, expect } from 'vitest';
import { valorPorExtenso } from './extenso';

describe('valorPorExtenso', () => {
  it('valores simples', () => {
    expect(valorPorExtenso(1)).toBe('um real');
    expect(valorPorExtenso(2)).toBe('dois reais');
    expect(valorPorExtenso(100)).toBe('cem reais');
    expect(valorPorExtenso(101)).toBe('cento e um reais');
  });
  it('centavos', () => {
    expect(valorPorExtenso(1.5)).toBe('um real e cinquenta centavos');
    expect(valorPorExtenso(0.99)).toBe('noventa e nove centavos');
  });
  it('milhares e milhões', () => {
    expect(valorPorExtenso(1000)).toBe('mil reais');
    expect(valorPorExtenso(2500)).toBe('dois mil, quinhentos reais'.replace(', ', ' ')); // tolera espaço
    expect(valorPorExtenso(1000000)).toContain('um milhão');
  });
  it('valor típico de imóvel', () => {
    const s = valorPorExtenso(350000);
    expect(s).toContain('trezentos e cinquenta mil');
    expect(s).toContain('reais');
  });
});
