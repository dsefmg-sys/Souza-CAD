import { describe, it, expect } from 'vitest';
import { triangularDelaunay, gerarCurvasDeNivel, pontoNoPoligono, suavizarChaikin, intervaloSugerido, type Ponto3D } from './curvasNivel';

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

  it('ignora pontos sem altitude válida e não quebra', () => {
    const pts: Ponto3D[] = [{ x: 0, y: 0, z: NaN }, { x: 1, y: 1, z: 1 }];
    expect(gerarCurvasDeNivel(pts, { intervalo: 1 })).toEqual([]);
  });
});

describe('suavizarChaikin', () => {
  it('mantém uma linha reta reta (não inventa curva onde não há)', () => {
    const reta = [{ x: 5, y: 0 }, { x: 5, y: 4 }, { x: 5, y: 8 }];
    const s = suavizarChaikin(reta, 2);
    for (const p of s) expect(p.x).toBeCloseTo(5, 6);
    expect(s.length).toBeGreaterThan(reta.length); // ficou mais denso (curva de verdade)
  });

  it('não estoura pra fora do envelope dos pontos (fica colada aos dados)', () => {
    const zig = [{ x: 0, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 4 }, { x: 4, y: 6 }];
    const s = suavizarChaikin(zig, 3);
    for (const p of s) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(4); }
    // extremidades preservadas em linha aberta
    expect(s[0]).toEqual(zig[0]);
    expect(s[s.length - 1]).toEqual(zig[zig.length - 1]);
  });

  it('preserva o fechamento de um laço', () => {
    const loop = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 0, y: 0 }];
    const s = suavizarChaikin(loop, 2);
    expect(s[0].x).toBeCloseTo(s[s.length - 1].x, 6);
    expect(s[0].y).toBeCloseTo(s[s.length - 1].y, 6);
  });
});

describe('intervaloSugerido', () => {
  it('desnível grande → intervalo maior (evita emaranhado)', () => {
    const pts: Ponto3D[] = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 120 }];
    expect(intervaloSugerido(pts)).toBe(10); // 120/12=10
  });
  it('desnível pequeno → intervalo fino', () => {
    const pts: Ponto3D[] = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 5 }];
    expect(intervaloSugerido(pts)).toBe(0.5); // 5/12≈0.42 → 0.5
  });
  it('sem desnível ou poucos pontos → 1', () => {
    expect(intervaloSugerido([{ x: 0, y: 0, z: 5 }])).toBe(1);
    expect(intervaloSugerido([{ x: 0, y: 0, z: 5 }, { x: 1, y: 1, z: 5 }])).toBe(1);
  });
});

describe('pontoNoPoligono', () => {
  it('acerta dentro e fora de um quadrado', () => {
    const q = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(pontoNoPoligono(5, 5, q)).toBe(true);
    expect(pontoNoPoligono(15, 5, q)).toBe(false);
  });
});
