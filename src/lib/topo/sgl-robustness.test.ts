import { describe, it, expect } from 'vitest';
import { calcularAreaSgl, type LatLonH } from './sgl';
import { calcular } from './calcular';
import type { Vertex } from './types';

describe('SGL Altitude Robustness', () => {
  it('should fall back to h = 0 and avoid NaN when elevation is NaN, null, or undefined', () => {
    const pts: LatLonH[] = [
      { lat: -20, lon: -42, h: NaN },
      { lat: -20.001, lon: -42, h: 100 },
      { lat: -20.001, lon: -42.001, h: Number.NaN },
      { lat: -20, lon: -42.001, h: (undefined as unknown as number) },
    ];

    const result = calcularAreaSgl(pts);
    expect(result.areaM2).toBeGreaterThan(0);
    expect(Number.isFinite(result.areaM2)).toBe(true);
    expect(Number.isFinite(result.perimetro)).toBe(true);
    
    result.plano.forEach((pt) => {
      expect(Number.isFinite(pt.e)).toBe(true);
      expect(Number.isFinite(pt.n)).toBe(true);
    });
  });

  it('should fall back to h = 0 when elevation is Infinity or -Infinity', () => {
    const pts: LatLonH[] = [
      { lat: -20, lon: -42, h: Infinity },
      { lat: -20.001, lon: -42, h: -Infinity },
      { lat: -20.001, lon: -42.001, h: 50 },
      { lat: -20, lon: -42.001, h: 10 },
    ];

    const result = calcularAreaSgl(pts);
    expect(result.areaM2).toBeGreaterThan(0);
    expect(Number.isFinite(result.areaM2)).toBe(true);
    expect(Number.isFinite(result.perimetro)).toBe(true);
  });
  it('should process Vertex with undefined/invalid elevation correctly in calcular', () => {
    const vertices: Vertex[] = [
      { id: '1', ordem: 0, nome: 'V1', lat: -20, lon: -42, elevacao: (undefined as unknown as number), leste: 100, norte: 200, codigoCampo: '', tipo: 'M', codigoSigef: '', isDivisa: false },
      { id: '2', ordem: 1, nome: 'V2', lat: -20.001, lon: -42, elevacao: (null as unknown as number), leste: 100, norte: 100, codigoCampo: '', tipo: 'M', codigoSigef: '', isDivisa: false },
      { id: '3', ordem: 2, nome: 'V3', lat: -20.001, lon: -42.001, elevacao: NaN, leste: 200, norte: 100, codigoCampo: '', tipo: 'M', codigoSigef: '', isDivisa: false },
      { id: '4', ordem: 3, nome: 'V4', lat: -20, lon: -42.001, elevacao: 250, leste: 200, norte: 200, codigoCampo: '', tipo: 'M', codigoSigef: '', isDivisa: false },
    ];

    const res = calcular(vertices);
    expect(res.areaM2).toBeGreaterThan(0);
    expect(Number.isFinite(res.areaM2)).toBe(true);
    expect(Number.isFinite(res.perimetro)).toBe(true);
    expect(res.lados.length).toBe(4);
    res.lados.forEach((lado) => {
      expect(Number.isFinite(lado.distancia)).toBe(true);
      expect(Number.isFinite(lado.azimute)).toBe(true);
    });
  });
});
