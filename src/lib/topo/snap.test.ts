import { describe, it, expect } from 'vitest';
import { snapUtm } from './snap';

const alvos = [{ leste: 1000, norte: 2000 }, { leste: 1050, norte: 2080 }];

describe('snapUtm', () => {
  it('encaixa num vértice dentro da tolerância', () => {
    const r = snapUtm(1001.2, 2000.8, alvos, { tolVerticeM: 2 });
    expect(r.tipo).toBe('vertice');
    expect(r.leste).toBe(1000);
    expect(r.norte).toBe(2000);
  });
  it('não encaixa em vértice fora da tolerância', () => {
    const r = snapUtm(1010, 2010, alvos, { tolVerticeM: 2 });
    expect(r.tipo).not.toBe('vertice');
  });
  it('encaixa na grade quando perto de um nó da grade', () => {
    const r = snapUtm(1199.5, 2000.5, [], { gradeIntervalo: 100, tolGradeM: 5 });
    expect(r.tipo).toBe('grade');
    expect(r.leste).toBe(1200);
    expect(r.norte).toBe(2000);
  });
  it('devolve o ponto original quando nada encaixa', () => {
    const r = snapUtm(1234.5, 2345.6, [], {});
    expect(r.tipo).toBe(null);
    expect(r.leste).toBe(1234.5);
  });
  it('encaixa no ponto médio de um segmento', () => {
    const segmentos = [{ a: { leste: 1000, norte: 2000 }, b: { leste: 1100, norte: 2000 } }];
    const r = snapUtm(1051, 2000.5, [], { tolVerticeM: 5, segmentos });
    expect(r.tipo).toBe('meio');
    expect(r.leste).toBe(1050);
    expect(r.norte).toBe(2000);
  });
  it('encaixa no pé da perpendicular', () => {
    const segmentos = [{ a: { leste: 1000, norte: 2000 }, b: { leste: 1100, norte: 2000 } }];
    const r = snapUtm(1031, 2001, [], {
      tolVerticeM: 5,
      segmentos,
      pontoOrigem: { leste: 1030, norte: 2050 }
    });
    expect(r.tipo).toBe('perpendicular');
    expect(r.leste).toBe(1030);
    expect(r.norte).toBe(2000);
  });
  it('encaixa no cruzamento de dois segmentos', () => {
    const segmentos = [
      { a: { leste: 1000, norte: 2000 }, b: { leste: 1100, norte: 2000 } },
      { a: { leste: 1050, norte: 1950 }, b: { leste: 1050, norte: 2050 } }
    ];
    const r = snapUtm(1050.8, 1999.2, [], { tolVerticeM: 5, segmentos });
    expect(r.tipo).toBe('intersecao');
    expect(r.leste).toBe(1050);
    expect(r.norte).toBe(2000);
  });
  it('encaixa no alinhamento de extensão', () => {
    const segmentos = [{ a: { leste: 1000, norte: 2000 }, b: { leste: 1100, norte: 2000 } }];
    const r = snapUtm(1110, 2000.8, [], { tolVerticeM: 5, segmentos });
    expect(r.tipo).toBe('extensao');
    expect(r.leste).toBe(1110);
    expect(r.norte).toBe(2000);
  });
});
