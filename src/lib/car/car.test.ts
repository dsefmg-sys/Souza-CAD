import { describe, it, expect } from 'vitest';
import {
  percentualReservaLegal, reservaLegalMinimaHa, conferirReservaLegal,
  numeroModulosFiscais, classificarImovel, appMargemRio, appLago, APP_NASCENTE_M, resumirCar,
} from './car';

describe('Reserva Legal por bioma', () => {
  it('percentuais legais', () => {
    expect(percentualReservaLegal('amazonia-floresta')).toBe(0.8);
    expect(percentualReservaLegal('amazonia-cerrado')).toBe(0.35);
    expect(percentualReservaLegal('amazonia-campos')).toBe(0.2);
    expect(percentualReservaLegal('demais')).toBe(0.2);
  });

  it('área mínima e conferência', () => {
    expect(reservaLegalMinimaHa(100, 'demais')).toBeCloseTo(20);
    expect(reservaLegalMinimaHa(100, 'amazonia-floresta')).toBeCloseTo(80);
    const ok = conferirReservaLegal(100, 'demais', 25);
    expect(ok.atende).toBe(true);
    expect(ok.faltaHa).toBe(0);
    const falta = conferirReservaLegal(100, 'demais', 12);
    expect(falta.atende).toBe(false);
    expect(falta.faltaHa).toBeCloseTo(8);
  });
});

describe('Módulos fiscais', () => {
  it('nº de módulos e classificação', () => {
    // módulo fiscal de 20 ha; imóvel de 50 ha = 2,5 MF = pequena
    expect(numeroModulosFiscais(50, 20)).toBeCloseTo(2.5);
    expect(classificarImovel(0.5)).toBe('minifundio');
    expect(classificarImovel(2.5)).toBe('pequena');
    expect(classificarImovel(4)).toBe('pequena');   // 4 MF ainda é pequena
    expect(classificarImovel(10)).toBe('media');
    expect(classificarImovel(20)).toBe('grande');
  });
  it('módulo fiscal inválido não divide por zero', () => {
    expect(numeroModulosFiscais(50, 0)).toBe(0);
  });
});

describe('APP — faixas do Código Florestal', () => {
  it('margem de rio pela largura', () => {
    expect(appMargemRio(5)).toBe(30);    // < 10 m
    expect(appMargemRio(10)).toBe(50);   // 10–50
    expect(appMargemRio(50)).toBe(50);
    expect(appMargemRio(120)).toBe(100); // 50–200
    expect(appMargemRio(400)).toBe(200); // 200–600
    expect(appMargemRio(700)).toBe(500); // > 600
  });
  it('nascente e lago', () => {
    expect(APP_NASCENTE_M).toBe(50);
    expect(appLago(10)).toBe(50);   // rural até 20 ha
    expect(appLago(30)).toBe(100);  // rural acima de 20 ha
    expect(appLago(30, true)).toBe(30); // urbano
  });
});

describe('resumo consolidado', () => {
  it('monta o resumo e classifica', () => {
    const r = resumirCar({ areaImovelHa: 80, bioma: 'demais', moduloFiscalHa: 20, reservaLegalHa: 10 });
    expect(r.numModulos).toBeCloseTo(4);
    expect(r.classe).toBe('pequena');
    expect(r.reservaLegal.exigidaHa).toBeCloseTo(16); // 20% de 80
    expect(r.reservaLegal.atende).toBe(false);
    expect(r.reservaLegal.faltaHa).toBeCloseTo(6);
  });
});
