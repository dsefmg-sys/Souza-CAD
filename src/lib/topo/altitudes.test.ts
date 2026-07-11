import { describe, it, expect } from 'vitest';
import { estimarAltitudes } from './altitudes';
import type { Ponto2D, Ponto3D } from './curvasNivel';

describe('estimarAltitudes', () => {
  it('sem pontos conhecidos devolve null pra todos', () => {
    const alvos: Ponto2D[] = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    expect(estimarAltitudes([], alvos)).toEqual([null, null]);
  });

  it('plano horizontal (todos z=10) devolve 10 no interior', () => {
    const conhecidos: Ponto3D[] = [
      { x: 0, y: 0, z: 10 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 10, z: 10 },
      { x: 10, y: 10, z: 10 },
    ];
    const [z] = estimarAltitudes(conhecidos, [{ x: 5, y: 5 }]);
    expect(z).toBeCloseTo(10, 6);
  });

  it('rampa linear em x interpola baricentricamente', () => {
    // z = x: canto em (0,0,0), (10,0,10), (0,10,0) -> ponto (5,2) deve dar z=5
    const conhecidos: Ponto3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 10, z: 0 },
      { x: 10, y: 10, z: 10 },
    ];
    const [z] = estimarAltitudes(conhecidos, [{ x: 5, y: 2 }]);
    expect(z).toBeCloseTo(5, 6);
  });

  it('alvo que coincide com um ponto medido devolve a cota exata', () => {
    const conhecidos: Ponto3D[] = [
      { x: 0, y: 0, z: 3 },
      { x: 10, y: 0, z: 7 },
      { x: 0, y: 10, z: 5 },
    ];
    const [z] = estimarAltitudes(conhecidos, [{ x: 10, y: 0 }]);
    expect(z).toBeCloseTo(7, 6);
  });

  it('alvo fora do fecho cai no IDW e fica no intervalo das cotas', () => {
    const conhecidos: Ponto3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 10, z: 4 },
    ];
    const [z] = estimarAltitudes(conhecidos, [{ x: 100, y: 100 }]);
    expect(z).not.toBeNull();
    expect(z as number).toBeGreaterThanOrEqual(0);
    expect(z as number).toBeLessThanOrEqual(10);
  });

  it('deduplica espacialmente pontos coincidentes (< 1mm) para evitar triangulação corrompida', () => {
    const conhecidos: Ponto3D[] = [
      { x: 0, y: 0, z: 5 },
      { x: 0.0001, y: 0.0002, z: 10 }, // duplicado do primeiro
      { x: 10, y: 0, z: 10 },
      { x: 0, y: 10, z: 10 },
    ];
    // Deve ignorar o ponto duplicado (mantendo apenas 3) e interpolar corretamente no centro
    const [z] = estimarAltitudes(conhecidos, [{ x: 3, y: 3 }]);
    expect(z).not.toBeNull();
    expect(z).toBeCloseTo(8, 6);
  });
});
