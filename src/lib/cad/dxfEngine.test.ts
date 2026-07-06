import { describe, it, expect } from 'vitest';
import { gerarDxf, type Ent } from './dxfEngine';

describe('gerarDxf — texto seguro', () => {
  it('quebra de linha no texto não corrompe a estrutura do DXF', () => {
    const ents: Ent[] = [
      { id: 1, t: 'text', pos: { x: 10, y: 20 }, texto: 'linha um\nlinha dois\r\nlinha três', altura: 2 },
    ];
    const dxf = gerarDxf(ents);
    const linhas = dxf.split('\n');
    // estrutura de pares intacta: linha de código, linha de valor, alternando até o fim
    for (let i = 0; i + 1 < linhas.length; i += 2) {
      expect(Number.isNaN(parseInt(linhas[i], 10)), `linha ${i} deveria ser um código numérico: "${linhas[i]}"`).toBe(false);
    }
    // o conteúdo sobrevive numa linha só
    expect(dxf).toContain('linha um linha dois linha três');
  });

  it('layer com quebra de linha também é saneada (e vazia vira "0")', () => {
    const ents: Ent[] = [
      { id: 1, t: 'text', pos: { x: 0, y: 0 }, texto: 'ok', altura: 2, layer: 'MINHA\nLAYER' },
      { id: 2, t: 'text', pos: { x: 1, y: 1 }, texto: 'ok2', altura: 2, layer: '\n' },
    ];
    const dxf = gerarDxf(ents);
    expect(dxf).toContain('MINHA LAYER');
    const linhas = dxf.split('\n');
    for (let i = 0; i + 1 < linhas.length; i += 2) {
      expect(Number.isNaN(parseInt(linhas[i], 10))).toBe(false);
    }
  });
});
