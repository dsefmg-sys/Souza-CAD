import { describe, it, expect } from 'vitest';
import { aplicarOrto, parseAzimute } from './orto';

const base = { leste: 1000, norte: 2000 };

describe('aplicarOrto', () => {
  it('trava em 90°: azimute 47° vira 90° (Leste), distância preservada', () => {
    // alvo a ~47° de azimute, 100 m
    const az = (47 * Math.PI) / 180;
    const alvo = { leste: 1000 + 100 * Math.sin(az), norte: 2000 + 100 * Math.cos(az) };
    const r = aplicarOrto(base, alvo, 90);
    expect(r.leste).toBeCloseTo(1100, 6);
    expect(r.norte).toBeCloseTo(2000, 6);
  });

  it('trava em 15°: azimute 47° vai pro múltiplo mais próximo (45°)', () => {
    const az = (47 * Math.PI) / 180;
    const alvo = { leste: 1000 + 100 * Math.sin(az), norte: 2000 + 100 * Math.cos(az) };
    const r = aplicarOrto(base, alvo, 15);
    const d = Math.hypot(r.leste - base.leste, r.norte - base.norte);
    const azR = ((Math.atan2(r.leste - base.leste, r.norte - base.norte) * 180) / Math.PI + 360) % 360;
    expect(d).toBeCloseTo(100, 6);
    expect(azR).toBeCloseTo(45, 6);
  });

  it('azimute ~358° trava no Norte (0°), sem dar 360', () => {
    const az = (358 * Math.PI) / 180;
    const alvo = { leste: 1000 + 50 * Math.sin(az), norte: 2000 + 50 * Math.cos(az) };
    const r = aplicarOrto(base, alvo, 15);
    expect(r.leste).toBeCloseTo(1000, 6);
    expect(r.norte).toBeCloseTo(2050, 6);
  });

  it('alvo em cima da base: devolve o próprio alvo (sem NaN)', () => {
    const r = aplicarOrto(base, base, 90);
    expect(r).toEqual(base);
  });
});

describe('parseAzimute', () => {
  it('decimal com ponto e com vírgula', () => {
    expect(parseAzimute('123.5')).toBeCloseTo(123.5);
    expect(parseAzimute('123,5')).toBeCloseTo(123.5);
  });
  it('graus minutos segundos por espaço', () => {
    expect(parseAzimute('45 30 00')).toBeCloseTo(45.5);
    expect(parseAzimute('45 30')).toBeCloseTo(45.5);
  });
  it('com símbolos de grau/minuto/segundo', () => {
    expect(parseAzimute('45°30\'00"')).toBeCloseTo(45.5);
  });
  it('rejeita lixo, negativo, minuto >= 60 e acima de 360', () => {
    expect(parseAzimute('abc')).toBeNull();
    expect(parseAzimute('-10')).toBeNull();
    expect(parseAzimute('45 75')).toBeNull();
    expect(parseAzimute('400')).toBeNull();
  });
  it('360 vira 0', () => {
    expect(parseAzimute('360')).toBe(0);
  });
});
