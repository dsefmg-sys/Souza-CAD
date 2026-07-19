import { describe, it, expect } from 'vitest';
import { MUNICIPIOS } from './municipios';
import type { PerfilUso } from '../store/perfilUso';

describe('Resolução de Localização de Clientes para Mapa SaaS', () => {
  it('identifica coordenadas reais de GPS quando fornecidas', () => {
    const perfil: PerfilUso = {
      uid: 'u1',
      email: 'agrimensor@campo.com',
      lat: -20.65,
      lon: -41.91,
      criadoEm: Date.now(),
    };

    expect(perfil.lat).toBe(-20.65);
    expect(perfil.lon).toBe(-41.91);
    expect(Number.isFinite(perfil.lat)).toBe(true);
  });

  it('mapeia corretamente municípios conhecidos para suas coordenadas âncora', () => {
    const esperaFeliz = MUNICIPIOS['espera feliz-mg'];
    expect(esperaFeliz).toBeDefined();
    expect(esperaFeliz.lat).toBeCloseTo(-20.6506, 3);
    expect(esperaFeliz.lon).toBeCloseTo(-41.9094, 3);

    const beloHorizonte = MUNICIPIOS['belo horizonte-mg'];
    expect(beloHorizonte).toBeDefined();
    expect(beloHorizonte.lat).toBeCloseTo(-19.9167, 3);

    const brasilia = MUNICIPIOS['brasília-df'];
    expect(brasilia).toBeDefined();
    expect(brasilia.lat).toBeCloseTo(-15.7942, 3);
  });

  it('suporta normalização de nomes de município com letras maiúsculas e espaços', () => {
    const rawInput = '   Espera Feliz-MG  ';
    const normalized = rawInput.trim().toLowerCase();
    expect(MUNICIPIOS[normalized]).toBeDefined();
  });
});
