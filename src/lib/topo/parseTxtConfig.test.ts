import { describe, it, expect } from 'vitest';
import { parseTxt } from './parseTxt';
import type { ImportTxtConfig } from './types';

describe('parseTxt com configuração de colunas', () => {
  it('lê na ordem padrão (sem config) — Nome;Código;Norte;Leste;Elev', () => {
    const txt = 'Nome;Cod;N;E;H\nP1;DIVISA;7700000.5;300000.25;850.1';
    const [p] = parseTxt(txt);
    expect(p.nome).toBe('P1');
    expect(p.norte).toBeCloseTo(7700000.5);
    expect(p.leste).toBeCloseTo(300000.25);
    expect(p.elevacao).toBeCloseTo(850.1);
  });

  it('respeita ordem invertida e captura sigmas e método', () => {
    // colunas: nome ; leste ; norte ; altitude ; sigmaX ; sigmaY ; sigmaZ ; metodo
    const cfg: ImportTxtConfig = {
      separador: ';', decimal: '.', temCabecalho: true,
      colunas: ['nome', 'leste', 'norte', 'elevacao', 'sigmaX', 'sigmaY', 'sigmaZ', 'metodo'],
    };
    const txt = [
      'Ponto;Este;Norte;Alt;sx;sy;sz;Metodo',
      'V1;300000.25;7700000.5;850.1;0.012;0.015;0.030;PG6',
    ].join('\n');
    const [p] = parseTxt(txt, cfg);
    expect(p.nome).toBe('V1');
    expect(p.leste).toBeCloseTo(300000.25);
    expect(p.norte).toBeCloseTo(7700000.5);
    expect(p.sigmaX).toBeCloseTo(0.012);
    expect(p.sigmaY).toBeCloseTo(0.015);
    expect(p.sigmaZ).toBeCloseTo(0.030);
    expect(p.metodo).toBe('PG6');
  });

  it('aceita separador por vírgula e decimal por vírgula', () => {
    const cfg: ImportTxtConfig = {
      separador: 'tab', decimal: ',', temCabecalho: false,
      colunas: ['nome', 'norte', 'leste', 'elevacao'],
    };
    const txt = 'M1\t7700000,5\t300000,25\t850,1';
    const [p] = parseTxt(txt, cfg);
    expect(p.norte).toBeCloseTo(7700000.5);
    expect(p.leste).toBeCloseTo(300000.25);
    expect(p.elevacao).toBeCloseTo(850.1);
  });

  it('descarta linha sem Norte/Leste válidos', () => {
    const cfg: ImportTxtConfig = {
      separador: ';', decimal: '.', temCabecalho: false,
      colunas: ['nome', 'norte', 'leste'],
    };
    const txt = 'lixo;abc;def\nM1;7700000;300000';
    const pts = parseTxt(txt, cfg);
    expect(pts).toHaveLength(1);
    expect(pts[0].nome).toBe('M1');
  });

  it('formato padrão lê os erros (ErroY→sigmaY do Norte, ErroX→sigmaX do Leste)', () => {
    // Nome;Código;Norte;Leste;Elev;ErroY;ErroX;ErroVert
    const txt = 'Nome;Cod;N;E;H;eY;eX;eZ\nP1;DIVISA;7700000.5;300000.25;850.1;0.015;0.012;0.030';
    const [p] = parseTxt(txt);
    expect(p.sigmaY).toBeCloseTo(0.015); // erro do Norte
    expect(p.sigmaX).toBeCloseTo(0.012); // erro do Leste
    expect(p.sigmaZ).toBeCloseTo(0.030);
  });

  it('não confunde dado com cabeçalho quando a 1a linha já é ponto', () => {
    // sem cabeçalho: a primeira linha tem Norte e Leste numéricos → não pode ser descartada
    const txt = 'P1;DIVISA;7700000.5;300000.25;850.1\nP2;DIVISA;7700010.5;300010.25;851.0';
    const pts = parseTxt(txt);
    expect(pts).toHaveLength(2);
    expect(pts[0].nome).toBe('P1');
  });

  it('decimal por vírgula NÃO multiplica coordenada que veio com ponto decimal', () => {
    // usuário marcou decimal ',' mas a célula usa '.' e não tem vírgula → não tratar ponto como milhar
    const cfg: ImportTxtConfig = {
      separador: ';', decimal: ',', temCabecalho: false,
      colunas: ['nome', 'norte', 'leste'],
    };
    const txt = 'M1;7700000.5;300000.25';
    const [p] = parseTxt(txt, cfg);
    expect(p.norte).toBeCloseTo(7700000.5);
    expect(p.leste).toBeCloseTo(300000.25); // NÃO virou 30000025
  });
});
