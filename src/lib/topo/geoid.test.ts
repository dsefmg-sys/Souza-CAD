import { describe, it, expect } from 'vitest';
import {
  calcularOndulacaoGeoidalMAPGEO,
  elipsoidalParaOrtometrica,
  ortometricaParaElipsoidal,
  ANCORAS_MAPGEO_BRASIL,
} from './geoid';

describe('geoid MAPGEO IBGE', () => {
  it('calcula ondulação geoidal N com precisão para coordenadas conhecidas no Brasil', () => {
    // Espera Feliz - MG
    const nEF = calcularOndulacaoGeoidalMAPGEO(-20.65, -41.90);
    expect(nEF).toBeCloseTo(-10.5, 1);

    // Brasília - DF
    const nDF = calcularOndulacaoGeoidalMAPGEO(-15.78, -47.92);
    expect(nDF).toBeCloseTo(-18.4, 1);

    // Porto Alegre - RS
    const nPOA = calcularOndulacaoGeoidalMAPGEO(-30.03, -51.23);
    expect(nPOA).toBeCloseTo(-6.8, 1);
  });

  it('converte corretamente entre Altitude Elipsoidal (h) e Ortométrica (H)', () => {
    const N = -18.4; // DF
    const h = 1000;  // GNSS elipsoidal

    // H = h - N = 1000 - (-18.4) = 1018.4
    const H = elipsoidalParaOrtometrica(h, N);
    expect(H).toBe(1018.4);

    // h = H + N = 1018.4 + (-18.4) = 1000
    const hVolta = ortometricaParaElipsoidal(H, N);
    expect(hVolta).toBe(1000);
  });

  it('retorna fallback seguro para coordenadas inválidas', () => {
    expect(calcularOndulacaoGeoidalMAPGEO(NaN, NaN)).toBe(-15.0);
  });
});
