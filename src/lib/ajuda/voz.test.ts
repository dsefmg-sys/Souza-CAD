import { describe, it, expect } from 'vitest';
import { prepararTextoParaFala, dividirEmFrases, melhorVozPt } from './voz';

describe('prepararTextoParaFala', () => {
  it('remove marcação markdown e parênteses', () => {
    expect(prepararTextoParaFala('Use o botão *PONTOS* (no topo) pra importar.')).toBe(
      'Use o botão PONTOS no topo pra importar.',
    );
  });

  it('troca ° por "graus"', () => {
    expect(prepararTextoParaFala('ângulo de 90° ou 45°')).toBe('ângulo de 90 graus ou 45 graus');
  });

  it('troca travessão por vírgula', () => {
    expect(prepararTextoParaFala('duas coisas — a chave e o nível')).toBe('duas coisas, a chave e o nível');
  });

  it('separa palavras coladas por barra', () => {
    expect(prepararTextoParaFala('GRS80/SIRGAS2000')).toBe('GRS80 SIRGAS2000');
  });
});

describe('dividirEmFrases', () => {
  it('divide em frases pela pontuação', () => {
    const frases = dividirEmFrases('Primeira frase. Segunda frase! Terceira frase?');
    expect(frases).toEqual(['Primeira frase.', 'Segunda frase!', 'Terceira frase?']);
  });

  it('quebra frase única muito longa em pedaços menores, respeitando vírgulas', () => {
    const fraseLonga = `Uma frase bem longa, com várias vírgulas separando ideias diferentes, ${'palavra '.repeat(20)}, e mais um pedaço final para garantir que passe do limite.`;
    const frases = dividirEmFrases(fraseLonga, 80);
    expect(frases.length).toBeGreaterThan(1);
    frases.forEach((f) => expect(f.length).toBeLessThanOrEqual(120));
  });

  it('não divide frase curta', () => {
    expect(dividirEmFrases('Frase única e curta.')).toEqual(['Frase única e curta.']);
  });
});

describe('melhorVozPt', () => {
  it('retorna null para lista vazia', () => {
    expect(melhorVozPt([])).toBeNull();
  });

  it('prefere voz online "Natural" em pt-BR sobre a voz local "Compact"', () => {
    const vozes = [
      { name: 'Microsoft Maria Desktop - Portuguese(Brazil) Compact', lang: 'pt-BR', localService: true },
      { name: 'Microsoft Francisca Online (Natural) - Portuguese (Brazil)', lang: 'pt-BR', localService: false },
    ];
    expect(melhorVozPt(vozes)?.name).toContain('Francisca');
  });

  it('prefere pt-BR sobre pt-PT quando as duas são igualmente locais', () => {
    const vozes = [
      { name: 'Voz Portugal', lang: 'pt-PT', localService: true },
      { name: 'Voz Brasil', lang: 'pt-BR', localService: true },
    ];
    expect(melhorVozPt(vozes)?.name).toBe('Voz Brasil');
  });
});
