import { describe, it, expect } from 'vitest';
import {
  azimute,
  distancia,
  azimuteDMS,
  numBR,
  numBRmilhar,
  formatMatricula,
} from './geometry';

describe('Geometry and Formatting Utils', () => {
  describe('azimute', () => {
    it('calcula azimute no norte (0 graus)', () => {
      const a = { e: 0, n: 0 };
      const b = { e: 0, n: 10 };
      expect(azimute(a, b)).toBeCloseTo(0, 6);
    });

    it('calcula azimute no leste (90 graus)', () => {
      const a = { e: 0, n: 0 };
      const b = { e: 10, n: 0 };
      expect(azimute(a, b)).toBeCloseTo(90, 6);
    });

    it('calcula azimute no sul (180 graus)', () => {
      const a = { e: 0, n: 0 };
      const b = { e: 0, n: -10 };
      expect(azimute(a, b)).toBeCloseTo(180, 6);
    });

    it('calcula azimute no oeste (270 graus)', () => {
      const a = { e: 0, n: 0 };
      const b = { e: -10, n: 0 };
      expect(azimute(a, b)).toBeCloseTo(270, 6);
    });

    it('retorna valor positivo para angulos negativos', () => {
      const a = { e: 0, n: 0 };
      const b = { e: -10, n: 10 }; // noroeste: -45 graus
      expect(azimute(a, b)).toBeCloseTo(315, 6);
    });
  });

  describe('distancia', () => {
    it('calcula distancia plana corretamente', () => {
      const a = { e: 0, n: 0 };
      const b = { e: 3, n: 4 };
      expect(distancia(a, b)).toBe(5);
    });
  });

  describe('azimuteDMS', () => {
    it('formata angulo inteiro simples', () => {
      expect(azimuteDMS(45)).toBe('45°00\'00"');
    });

    it('formata decimais de grau em minutos e segundos', () => {
      // 120.5 graus = 120 graus e 30 minutos
      expect(azimuteDMS(120.5)).toBe('120°30\'00"');
    });

    it('propaga o carry de segundos para minutos', () => {
      // 45 + 59.99/3600 graus -> segundos arredondados para 60, minutos avançam
      // 45.0166666...
      expect(azimuteDMS(45.016666666)).toBe('45°01\'00"');
    });

    it('propaga o carry de minutos para graus', () => {
      // 45 graus e 59.9 minutos -> avança para 46 graus
      expect(azimuteDMS(45.999999)).toBe('46°00\'00"');
    });

    it('limita graus ao circulo de 360 graus', () => {
      expect(azimuteDMS(360.5)).toBe('0°30\'00"');
      expect(azimuteDMS(-0.5)).toBe('359°30\'00"');
    });
  });

  describe('numBR', () => {
    it('formata valor BR com virgula', () => {
      expect(numBR(1004.58)).toBe('1004,58');
      expect(numBR(1004.58, 1)).toBe('1004,6');
      expect(numBR(0)).toBe('0,00');
    });
  });

  describe('numBRmilhar', () => {
    it('formata com pontos de milhar e virgula', () => {
      expect(numBRmilhar(1004.58)).toBe('1.004,58');
      expect(numBRmilhar(1234567.89)).toBe('1.234.567,89');
      expect(numBRmilhar(0)).toBe('0,00');
      expect(numBRmilhar(150, 0)).toBe('150');
    });
  });

  describe('formatMatricula', () => {
    it('formata matriculas numericas com separador de milhar', () => {
      expect(formatMatricula('5476')).toBe('5.476');
      expect(formatMatricula('123456')).toBe('123.456');
    });

    it('mantem matriculas alfanumericas intactas', () => {
      expect(formatMatricula('Matricula 123')).toBe('Matricula 123');
      expect(formatMatricula('')).toBe('');
    });
  });
});
