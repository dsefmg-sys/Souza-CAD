import { describe, it, expect } from 'vitest';
import { aplicarOrto, parseAzimute, type ModoOrto } from './orto';

const p = (leste: number, norte: number) => ({ leste, norte });
// Tolerância para comparações de float (8 casas decimais = 0.000000005m, < 1mm)
const TOL = 1e-8;

describe('aplicarOrto — ortogonal 90°', () => {
  it('Norte: alvo a 10m ao Norte de base → trava em 0° (sem desvio)', () => {
    // base em (100, 100), alvo a 10m ao norte (100, 110)
    const r = aplicarOrto(p(100, 100), p(100, 110), 90);
    expect(r.leste).toBeCloseTo(100, 8);
    expect(r.norte).toBeCloseTo(110, 8);
  });

  it('Leste: alvo a 10m a Leste de base → trava em 90°', () => {
    const r = aplicarOrto(p(100, 100), p(110, 100), 90);
    expect(r.leste).toBeCloseTo(110, 8);
    expect(r.norte).toBeCloseTo(100, 8);
  });

  it('Sul: alvo a 10m ao Sul de base → trava em 180°', () => {
    const r = aplicarOrto(p(100, 100), p(100, 90), 90);
    expect(r.leste).toBeCloseTo(100, 8);
    expect(r.norte).toBeCloseTo(90, 8);
  });

  it('Oeste: alvo a 10m a Oeste de base → trava em 270°', () => {
    const r = aplicarOrto(p(100, 100), p(90, 100), 90);
    expect(r.leste).toBeCloseTo(90, 8);
    expect(r.norte).toBeCloseTo(100, 8);
  });

  it('44° trava pra 0° (Norte), preservando a distância', () => {
    // 44° está a 44° de 0° e a 46° de 90° → trava em 0° (Math.round(0.489)=0)
    // alvo: 10m a 44° → (106.95, 107.19)
    // trava em 0° com 10m: (100, 110)
    const r = aplicarOrto(p(100, 100), p(106.95, 107.19), 90);
    expect(r.leste).toBeCloseTo(100, 3);
    expect(r.norte).toBeCloseTo(110, 3);
    // distância preservada
    const dist = Math.hypot(r.leste - 100, r.norte - 100);
    expect(dist).toBeCloseTo(10, 3);
  });

  it('46° trava pra 90° (Leste), preservando a distância', () => {
    // 46° está a 1° de 45° (arredondado pra 90° porque Math.round(46/90)=round(0.511)=1)
    // BUG LATENTE: o ORTO 90° só tem 4 ângulos efetivos (0/90/180/270). Não tem NE (45°) nem
    // NO (315°). Para ter 8 direções, usar passo 45° (não é o que o "ORTO" do app faz).
    // trava em 90° com 10m: (110, 100)
    const r = aplicarOrto(p(100, 100), p(107.193, 106.947), 90);
    expect(r.leste).toBeCloseTo(110, 3);
    expect(r.norte).toBeCloseTo(100, 3);
  });

  it('45° (fronteira) trava pra 90° (Math.round arredonda 0.5 pra cima)', () => {
    // Math.round(45/90) = Math.round(0.5) = 1, então trava em 90°
    // Design choice do código: usar Math.round (banker's rounding não) — 0.5 sempre vai pra cima.
    const r = aplicarOrto(p(100, 100), p(107.071, 107.071) /* 10m a 45° */, 90);
    expect(r.leste).toBeCloseTo(110, 3);
    expect(r.norte).toBeCloseTo(100, 3);
  });
});

describe('aplicarOrto — polar 15°', () => {
  it('trava em saltos de 15°', () => {
    // 22° → trava em 15° (|22-15|=7, |22-30|=8, então 15°)
    // alvo: 10m a 22° → (3.746, 9.272)
    // trava em 15°: 10m a 15° → (2.588, 9.659)
    const r = aplicarOrto(p(100, 100), p(103.746, 109.272), 15);
    expect(r.leste).toBeCloseTo(102.588, 2);
    expect(r.norte).toBeCloseTo(109.659, 2);
  });

  it('0° (Norte) preservado com passo 15', () => {
    const r = aplicarOrto(p(100, 100), p(100, 110), 15);
    expect(r.leste).toBeCloseTo(100, 8);
    expect(r.norte).toBeCloseTo(110, 8);
  });

  it('cada direção Norte, Leste, Sul, Oeste funciona (0, 90, 180, 270)', () => {
    expect(aplicarOrto(p(0, 0), p(0, 10), 15).norte).toBeCloseTo(10, 8);
    expect(aplicarOrto(p(0, 0), p(10, 0), 15).leste).toBeCloseTo(10, 8);
    expect(aplicarOrto(p(0, 0), p(0, -10), 15).norte).toBeCloseTo(-10, 8);
    expect(aplicarOrto(p(0, 0), p(-10, 0), 15).leste).toBeCloseTo(-10, 8);
  });
});

describe('aplicarOrto — casos de borda', () => {
  it('passoGraus <= 0: retorna alvo sem modificação (desliga ORTO)', () => {
    const r = aplicarOrto(p(100, 100), p(107, 107), 0);
    expect(r).toEqual({ leste: 107, norte: 107 });
  });

  it('base === alvo (distância 0): retorna alvo', () => {
    const r = aplicarOrto(p(100, 100), p(100, 100), 90);
    expect(r).toEqual({ leste: 100, norte: 100 });
  });

  it('distância negativa não acontece (hypot sempre >= 0)', () => {
    // hypot(0, 0) = 0 → retorna alvo; se > 0 → processa normal
    const r = aplicarOrto(p(0, 0), p(0, 0), 90);
    expect(r).toEqual({ leste: 0, norte: 0 });
  });

  it('azimute exatamente na fronteira 359°/1° trava pra 0° (Norte)', () => {
    // 359° quase Norte. Com passo 90, vai pra 0°.
    // alvo: 10m a 359° → (-0.174, 9.998) → trava em 0°: (0, 10)
    const r = aplicarOrto(p(0, 0), p(-0.174, 9.998), 90);
    expect(r.leste).toBeCloseTo(0, 2);
    expect(r.norte).toBeCloseTo(10, 2);
  });
});

describe('parseAzimute — decimal', () => {
  it('lê decimal com ponto', () => {
    expect(parseAzimute('123.45')).toBeCloseTo(123.45, TOL);
  });

  it('lê decimal com vírgula (padrão BR)', () => {
    expect(parseAzimute('123,45')).toBeCloseTo(123.45, TOL);
  });

  it('lê número inteiro', () => {
    expect(parseAzimute('90')).toBe(90);
  });

  it('lê zero', () => {
    expect(parseAzimute('0')).toBe(0);
  });
});

describe('parseAzimute — DMS com espaço', () => {
  it('lê "45 30 15" = 45°30\'15" = 45.504166...', () => {
    expect(parseAzimute('45 30 15')).toBeCloseTo(45 + 30 / 60 + 15 / 3600, TOL);
  });

  it('lê "45 30" sem segundos = 45.5°', () => {
    expect(parseAzimute('45 30')).toBeCloseTo(45.5, TOL);
  });

  it('lê "45" sem minutos nem segundos = 45°', () => {
    expect(parseAzimute('45')).toBe(45);
  });

  it('lê "45,5 30 15" (vírgula no decimal)', () => {
    expect(parseAzimute('45,5 30 15')).toBeCloseTo(45.5 + 30 / 60 + 15 / 3600, TOL);
  });
});

describe('parseAzimute — com símbolos', () => {
  it('lê "45°30\'15\"" (com símbolos)', () => {
    expect(parseAzimute("45°30'15\"")).toBeCloseTo(45 + 30 / 60 + 15 / 3600, TOL);
  });

  it('lê "45º30′15″" (símbolos Unicode)', () => {
    expect(parseAzimute('45º30′15″')).toBeCloseTo(45 + 30 / 60 + 15 / 3600, TOL);
  });

  it('lê "45°30\'" (sem segundos)', () => {
    expect(parseAzimute("45°30'")).toBeCloseTo(45.5, TOL);
  });
});

describe('parseAzimute — validação', () => {
  it('string vazia: null', () => {
    expect(parseAzimute('')).toBe(null);
  });

  it('apenas espaços: null', () => {
    expect(parseAzimute('   ')).toBe(null);
  });

  it('4 partes: null (DMS só tem até 3)', () => {
    expect(parseAzimute('45 30 15 10')).toBe(null);
  });

  it('minutos >= 60: null', () => {
    expect(parseAzimute('45 60 15')).toBe(null);
  });

  it('segundos >= 60: null', () => {
    expect(parseAzimute('45 30 60')).toBe(null);
  });

  it('valor negativo: null', () => {
    expect(parseAzimute('-10')).toBe(null);
  });

  it('não-número: null', () => {
    expect(parseAzimute('abc')).toBe(null);
  });

  it('360° retorna 0 (módulo)', () => {
    // 360 vira 0 (módulo 360)
    expect(parseAzimute('360')).toBe(0);
  });

  it('valor > 360: rejeita com null (conservador — não faz wrap)', () => {
    // Design choice do código: > 360 retorna null (em vez de fazer módulo 360). Provavelmente
    // porque faz mais sentido validar do que aceitar entrada obviamente errada. Se quiser mudar,
    // é tirar a parte `|| az > 360` da validação.
    expect(parseAzimute('720')).toBe(null);
  });
});
