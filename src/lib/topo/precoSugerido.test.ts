import { describe, it, expect } from 'vitest';
import {
  precoSugerido,
  precosPorDificuldade,
  areaEfetiva,
  fatorDoNivel,
  tabelaCompleta,
  comDesconto,
  AREA_MINIMA_HA,
  AREAS_TABELA,
} from './precoSugerido';

describe('precoSugerido', () => {
  it('usa fator base 1000 e bate com a tabela de campo', () => {
    // √4 × 1000 = 2000 (nível mais fácil, área mínima)
    expect(precoSugerido(4, 1000, 0)).toBe(2000);
    // √100 × 1000 = 10000
    expect(precoSugerido(100, 1000, 0)).toBe(10000);
    // √100 × 1500 = 15000 (nível mais difícil)
    expect(precoSugerido(100, 1000, 5)).toBe(15000);
  });

  it('arredonda para o real cheio', () => {
    // √7 × 1000 = 2645,75… -> 2646
    expect(precoSugerido(7, 1000, 0)).toBe(2646);
    // √5 × 1000 = 2236,06… -> 2236
    expect(precoSugerido(5, 1000, 0)).toBe(2236);
  });

  it('conta área abaixo do mínimo como 4 ha', () => {
    expect(areaEfetiva(1)).toBe(AREA_MINIMA_HA);
    expect(areaEfetiva(0)).toBe(AREA_MINIMA_HA);
    // 2 ha e 4 ha dão o mesmo preço, pois 2 vira 4
    expect(precoSugerido(2, 1000, 0)).toBe(precoSugerido(4, 1000, 0));
  });

  it('protege contra área inválida', () => {
    expect(areaEfetiva(NaN)).toBe(AREA_MINIMA_HA);
  });

  it('cada nível soma 10% sobre o base', () => {
    expect(fatorDoNivel(1000, 0)).toBe(1000);
    expect(fatorDoNivel(1000, 5)).toBe(1500);
    // fator base = salário mínimo de exemplo
    expect(fatorDoNivel(1518, 0)).toBe(1518);
  });

  it('gera os seis preços por dificuldade em ordem crescente', () => {
    const precos = precosPorDificuldade(50, 1200);
    expect(precos).toHaveLength(6);
    for (let i = 1; i < precos.length; i++) {
      expect(precos[i]).toBeGreaterThan(precos[i - 1]);
    }
  });

  it('aplica desconto de 20% e 30% arredondando', () => {
    // 2000 - 20% = 1600 ; 2000 - 30% = 1400
    expect(comDesconto(2000, 20)).toBe(1600);
    expect(comDesconto(2000, 30)).toBe(1400);
    // sem desconto não mexe no valor
    expect(comDesconto(2000, 0)).toBe(2000);
    // protege contra valores fora da faixa
    expect(comDesconto(2000, -5)).toBe(2000);
    expect(comDesconto(2000, 150)).toBe(0);
  });

  it('monta a tabela completa com todas as áreas', () => {
    const t = tabelaCompleta(1000);
    expect(t).toHaveLength(AREAS_TABELA.length);
    expect(t[0].areaHa).toBe(4);
    expect(t[0].precos[0]).toBe(2000);
  });
});
