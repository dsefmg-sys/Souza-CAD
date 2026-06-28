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
  it('milhares e milhões com "e"/"de" corretos', () => {
    expect(valorPorExtenso(1000)).toBe('mil reais');
    expect(valorPorExtenso(1100)).toBe('mil e cem reais');
    expect(valorPorExtenso(1005)).toBe('mil e cinco reais');
    expect(valorPorExtenso(2500)).toBe('dois mil e quinhentos reais');
    expect(valorPorExtenso(1000000)).toBe('um milhão de reais');
    expect(valorPorExtenso(2000000)).toBe('dois milhões de reais');
    expect(valorPorExtenso(1500000)).toBe('um milhão e quinhentos mil reais');
    expect(valorPorExtenso(2000001)).toBe('dois milhões e um reais');
  });
  it('valor típico de imóvel', () => {
    expect(valorPorExtenso(350000)).toBe('trezentos e cinquenta mil reais');
    expect(valorPorExtenso(350000.5)).toBe('trezentos e cinquenta mil reais e cinquenta centavos');
    expect(valorPorExtenso(1234.56)).toBe('mil, duzentos e trinta e quatro reais e cinquenta e seis centavos');
  });
});
