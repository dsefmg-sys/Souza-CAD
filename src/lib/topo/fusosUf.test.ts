import { describe, it, expect } from 'vitest';
import { FUSOS_POR_UF, fusosDasUfs } from './fusosUf';

describe('fusosDasUfs', () => {
  it('cobre as 27 UFs', () => {
    expect(Object.keys(FUSOS_POR_UF).length).toBe(27);
  });

  it('MG sugere 22, 23 e 24', () => {
    expect(fusosDasUfs(['MG'])).toEqual([22, 23, 24]);
  });

  it('duas UFs viram a união ordenada sem repetição', () => {
    expect(fusosDasUfs(['ES', 'RJ'])).toEqual([23, 24]);
  });

  it('UF desconhecida ou com espaços não quebra', () => {
    expect(fusosDasUfs([' mg ', 'XX'])).toEqual([22, 23, 24]);
  });

  it('todo fuso está no intervalo do Brasil (18 a 25)', () => {
    for (const fusos of Object.values(FUSOS_POR_UF)) {
      for (const f of fusos) { expect(f).toBeGreaterThanOrEqual(18); expect(f).toBeLessThanOrEqual(25); }
    }
  });
});
