import { describe, it, expect } from 'vitest';
import { detectarZona, escolherZonaPorAncora, geoParaUtm, grausParaDMS } from './coords';
import { ancoraMunicipio } from './municipios';

describe('fuso sem âncora cai no fuso-base (detecção pura é impossível)', () => {
  it('mesma E/N é consistente em todos os fusos -> usa a base configurada', () => {
    const { leste, norte } = geoParaUtm(-20.6024, -41.9246, 24, 'S');
    expect(detectarZona(leste, norte, 'S', 23, [22, 23, 24, 25])).toBe(23);
  });
});

describe('fuso pela âncora do município (divisa 23/24, Espera Feliz)', () => {
  const ancora = ancoraMunicipio('Espera Feliz-MG')!;
  it('âncora de município é encontrada', () => {
    expect(ancora).toBeTruthy();
  });
  it('ponto a oeste de -42° resolve para zona 23', () => {
    // ponto real em zona 23 (lon -42.0034)
    const { leste, norte } = geoParaUtm(-20.5905, -42.0034, 23, 'S');
    expect(escolherZonaPorAncora(leste, norte, 'S', ancora, [22, 23, 24, 25])).toBe(23);
  });
  it('ponto a leste de -42° resolve para zona 24', () => {
    // ponto real em zona 24 (lon -41.9246)
    const { leste, norte } = geoParaUtm(-20.6024, -41.9246, 24, 'S');
    expect(escolherZonaPorAncora(leste, norte, 'S', ancora, [22, 23, 24, 25])).toBe(24);
  });
});

describe('grausParaDMS', () => {
  it('estilo sigef com hemisfério e zero-padding', () => {
    expect(grausParaDMS(-42.000846, { estilo: 'sigef', eixo: 'lon', casas: 3 })).toBe('42 00 03,046 W');
  });
  it('carry de arredondamento dos segundos', () => {
    // 0,9999999° -> não pode virar 60" nos segundos
    const s = grausParaDMS(-1 + 0.9999999 / 1, { estilo: 'memorial', casas: 3 });
    expect(s).not.toContain('60,000');
  });
});
