import { describe, it, expect } from 'vitest';
import { porAfastamento, porInterseccao } from './verticeVirtual';

describe('porAfastamento', () => {
  const base = { leste: 300000, norte: 7700000 };

  it('azimute 0 (Norte) só soma no Norte', () => {
    const p = porAfastamento(base, 0, 50);
    expect(p.leste).toBeCloseTo(300000, 6);
    expect(p.norte).toBeCloseTo(7700050, 6);
  });

  it('azimute 90 (Leste) só soma no Este', () => {
    const p = porAfastamento(base, 90, 50);
    expect(p.leste).toBeCloseTo(300050, 6);
    expect(p.norte).toBeCloseTo(7700000, 6);
  });

  it('azimute 180 (Sul) subtrai no Norte', () => {
    const p = porAfastamento(base, 180, 50);
    expect(p.leste).toBeCloseTo(300000, 6);
    expect(p.norte).toBeCloseTo(7699950, 6);
  });

  it('azimute 270 (Oeste) subtrai no Este', () => {
    const p = porAfastamento(base, 270, 50);
    expect(p.leste).toBeCloseTo(299950, 6);
    expect(p.norte).toBeCloseTo(7700000, 6);
  });

  it('preserva a distância medida', () => {
    const p = porAfastamento(base, 37.5, 123.456);
    const d = Math.hypot(p.leste - base.leste, p.norte - base.norte);
    expect(d).toBeCloseTo(123.456, 6);
  });
});

describe('porInterseccao', () => {
  it('cruza duas retas perpendiculares no ponto esperado', () => {
    // reta horizontal y=10 (A→B) e reta vertical x=5 (C→D) cruzam em (5,10)
    const p = porInterseccao(
      { leste: 0, norte: 10 }, { leste: 20, norte: 10 },
      { leste: 5, norte: 0 }, { leste: 5, norte: 20 },
    );
    expect(p).not.toBeNull();
    expect(p!.leste).toBeCloseTo(5, 9);
    expect(p!.norte).toBeCloseTo(10, 9);
  });

  it('acha a interseção mesmo quando cai fora dos segmentos (é reta, não segmento)', () => {
    const p = porInterseccao(
      { leste: 0, norte: 0 }, { leste: 1, norte: 1 },     // reta y=x
      { leste: 0, norte: 10 }, { leste: 1, norte: 9 },    // reta y=10-x
    );
    expect(p).not.toBeNull();
    expect(p!.leste).toBeCloseTo(5, 9);
    expect(p!.norte).toBeCloseTo(5, 9);
  });

  it('retorna null para retas paralelas', () => {
    const p = porInterseccao(
      { leste: 0, norte: 0 }, { leste: 10, norte: 0 },
      { leste: 0, norte: 5 }, { leste: 10, norte: 5 },
    );
    expect(p).toBeNull();
  });
});
