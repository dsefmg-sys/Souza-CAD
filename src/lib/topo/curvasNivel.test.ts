import { describe, it, expect } from 'vitest';
import { triangularDelaunay, gerarCurvasDeNivel, pontoNoPoligono, suavizarChaikin, intervaloSugerido, filtrarOutliersAltimetricos, type Ponto3D } from './curvasNivel';

describe('triangularDelaunay', () => {
  it('triangula um quadrado em 2 triângulos', () => {
    const tris = triangularDelaunay([
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ]);
    expect(tris.length).toBe(2);
    // usa os 4 pontos (índices 0..3)
    const idx = new Set(tris.flat());
    expect(idx).toEqual(new Set([0, 1, 2, 3]));
  });

  it('devolve vazio com menos de 3 pontos', () => {
    expect(triangularDelaunay([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([]);
  });
});

describe('filtrarOutliersAltimetricos', () => {
  it('filtra picos de altitude espúrios (ex: erro de leitura GNSS ou pico de 1500m num terreno de 500m)', () => {
    const pontos: Ponto3D[] = [
      { x: 0, y: 0, z: 500 },
      { x: 10, y: 0, z: 502 },
      { x: 20, y: 0, z: 498 },
      { x: 30, y: 0, z: 501 },
      { x: 40, y: 0, z: 503 },
      { x: 50, y: 0, z: 499 },
      { x: 60, y: 0, z: 1500 }, // Outlier espúrio (pico falso)
    ];

    const filtrados = filtrarOutliersAltimetricos(pontos);
    expect(filtrados.length).toBe(6);
    expect(filtrados.some((p) => p.z === 1500)).toBe(false);
  });
});

describe('gerarCurvasDeNivel', () => {
  // superfície inclinada z = x sobre uma grade 0..10 → curvas de nível são retas verticais em x = nível
  function gradeInclinada(): Ponto3D[] {
    const pts: Ponto3D[] = [];
    for (let x = 0; x <= 10; x += 2) for (let y = 0; y <= 10; y += 2) pts.push({ x, y, z: x });
    return pts;
  }

  it('numa rampa z=x, cada curva fica na altura certa e reta na vertical', () => {
    const curvas = gerarCurvasDeNivel(gradeInclinada(), { intervalo: 2 });
    // deve haver curvas nos níveis internos 2,4,6,8 (0 e 10 são as bordas)
    const niveis = [...new Set(curvas.map((c) => c.nivel))].sort((a, b) => a - b);
    for (const n of [2, 4, 6, 8]) expect(niveis).toContain(n);
    // a curva de nível 6 deve ter todos os pontos em x ≈ 6
    const seis = curvas.filter((c) => c.nivel === 6).flatMap((c) => c.linha);
    expect(seis.length).toBeGreaterThan(0);
    for (const p of seis) expect(p.x).toBeCloseTo(6, 5);
  });

  it('recorta ao polígono: nada de curva com o centro do triângulo fora da área', () => {
    // meia área: só o polígono x ∈ [0,4]
    const poligono = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 10 }, { x: 0, y: 10 }];
    const curvas = gerarCurvasDeNivel(gradeInclinada(), { intervalo: 2, poligono });
    const xs = curvas.flatMap((c) => c.linha).map((p) => p.x);
    // não deve aparecer curva de nível 8 (fica em x=8, fora do polígono)
    expect(curvas.some((c) => c.nivel === 8)).toBe(false);
    expect(Math.max(...xs)).toBeLessThanOrEqual(4.001);
  });

  it('superfície plana (z constante) não gera curva', () => {
    const pts: Ponto3D[] = [{ x: 0, y: 0, z: 5 }, { x: 10, y: 0, z: 5 }, { x: 5, y: 10, z: 5 }];
    expect(gerarCurvasDeNivel(pts, { intervalo: 1 })).toEqual([]);
  });
});
