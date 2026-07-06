import { describe, it, expect } from 'vitest';
import { dividirSegmentoUtm, intersecaoRetasUtm, transladarPontosUtm } from './editing';

describe('editing math helpers', () => {
  it('divide um segmento em N partes iguais', () => {
    const a = { leste: 1000, norte: 2000 };
    const b = { leste: 1100, norte: 2000 };
    const pts = dividirSegmentoUtm(a, b, 4); // divide em 4 partes -> 3 pontos intermediarios
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ leste: 1025, norte: 2000 });
    expect(pts[1]).toEqual({ leste: 1050, norte: 2000 });
    expect(pts[2]).toEqual({ leste: 1075, norte: 2000 });
  });

  it('calcula interseção de retas infinitas', () => {
    const a = { leste: 1000, norte: 2000 };
    const b = { leste: 1100, norte: 2000 };
    const c = { leste: 1050, norte: 1950 };
    const d = { leste: 1050, norte: 2050 };
    const p = intersecaoRetasUtm(a, b, c, d);
    expect(p).not.toBeNull();
    expect(p!.leste).toBeCloseTo(1050);
    expect(p!.norte).toBeCloseTo(2000);

    // retas paralelas
    const a2 = { leste: 1000, norte: 2000 };
    const b2 = { leste: 1100, norte: 2000 };
    const c2 = { leste: 1000, norte: 2010 };
    const d2 = { leste: 1100, norte: 2010 };
    expect(intersecaoRetasUtm(a2, b2, c2, d2)).toBeNull();
  });

  it('translada conjunto de pontos por delta', () => {
    const pts = [
      { leste: 1000, norte: 2000 },
      { leste: 1010, norte: 2020 }
    ];
    const trans = transladarPontosUtm(pts, 10, -5);
    expect(trans[0]).toEqual({ leste: 1010, norte: 1995 });
    expect(trans[1]).toEqual({ leste: 1020, norte: 2015 });
  });
});
