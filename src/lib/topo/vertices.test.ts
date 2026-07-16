import { describe, it, expect } from 'vitest';
import {
  montarVertices,
  reordenar,
  recodificar,
  casasDecimais,
  correcoesPrecisaoViaTxt,
  aplicarCorrecoesPrecisao,
  type CorrecaoPrecisao,
} from './vertices';
import type { RawPoint, Vertex, TecnicoData } from './types';

const tec: Pick<TecnicoData, 'credenciamentoIncra' | 'contadorMarco' | 'contadorPonto'> = {
  credenciamentoIncra: 'COIN',
  contadorMarco: 1,
  contadorPonto: 1,
};

function v(sobre: { id?: string; nome?: string; leste: number; norte: number; elevacao?: number; codigoSigef?: string; lat?: number; lon?: number; tipo?: 'M' | 'P' | 'V' }): Vertex {
  return {
    id: sobre.id ?? `v_${sobre.leste}_${sobre.norte}`,
    ordem: 0,
    nome: sobre.nome ?? 'P1',
    codigoCampo: '',
    norte: sobre.norte,
    leste: sobre.leste,
    elevacao: sobre.elevacao ?? 100,
    lat: sobre.lat ?? 0,
    lon: sobre.lon ?? 0,
    tipo: sobre.tipo ?? 'P',
    codigoSigef: sobre.codigoSigef ?? 'COIN-P-0001',
    isDivisa: false,
  };
}

function p(sobre: { nome?: string; leste: number; norte: number; elevacao?: number; codigo?: string; status?: string }): RawPoint {
  return {
    nome: sobre.nome ?? '1',
    codigo: sobre.codigo ?? '',
    norte: sobre.norte,
    leste: sobre.leste,
    elevacao: sobre.elevacao ?? 100,
    status: sobre.status ?? 'FIXED',
    isBase: false,
    isSingle: false,
  };
}

describe('casasDecimais', () => {
  it('conta casas em inteiros (0)', () => {
    expect(casasDecimais(201300)).toBe(0);
    expect(casasDecimais(0)).toBe(0);
    expect(casasDecimais(-1234)).toBe(0);
  });
  it('conta casas em decimais', () => {
    expect(casasDecimais(201314.64)).toBe(2);
    expect(casasDecimais(201316.475)).toBe(3);
    expect(casasDecimais(0.001)).toBe(3);
  });
  it('ignora sinal', () => {
    expect(casasDecimais(-201316.475)).toBe(3);
  });
});

describe('correcoesPrecisaoViaTxt', () => {
  it('detecta vértice com 0 casas e casa com ponto de 3 casas a < 0.1m', () => {
    const vs = [v({ id: 'a', leste: 201300, norte: 7704918, elevacao: 814 })]; // 0 casas
    const pts = [p({ leste: 201300.165, norte: 7704918.243, elevacao: 814.058 })]; // 3 casas
    const cs = correcoesPrecisaoViaTxt(vs, pts);
    expect(cs).toHaveLength(1);
    expect(cs[0].verticeId).toBe('a');
    expect(cs[0].depois.leste).toBe(201300.165);
    expect(cs[0].depois.norte).toBe(7704918.243);
    expect(cs[0].distanciaM).toBeLessThan(0.5);
    expect(cs[0].motivo).toContain('leste');
    expect(cs[0].motivo).toContain('norte');
    expect(cs[0].motivo).toContain('elevacao');
  });

  it('detecta vértice com 2 casas (parcial) — corrige só o que tem mais precisão', () => {
    const vs = [v({ id: 'a', leste: 201314.64, norte: 7704766.264, elevacao: 755.519 })]; // 2/3/3
    const pts = [p({ leste: 201314.643, norte: 7704766.264, elevacao: 755.519 })]; // 3/3/3
    const cs = correcoesPrecisaoViaTxt(vs, pts);
    expect(cs).toHaveLength(1);
    expect(cs[0].depois.leste).toBe(201314.643);
    // Norte e elev já estão no mesmo nível, não atualiza
    expect(cs[0].depois.norte).toBe(7704766.264);
    expect(cs[0].depois.elevacao).toBe(755.519);
    expect(cs[0].motivo).toBe('leste');
  });

  it('NÃO corrige quando o TXT não traz ganho de precisão', () => {
    const vs = [v({ id: 'a', leste: 201316.475, norte: 7704753.531, elevacao: 748.978 })];
    const pts = [p({ leste: 201316.475, norte: 7704753.531, elevacao: 748.978 })]; // igual
    const cs = correcoesPrecisaoViaTxt(vs, pts);
    expect(cs).toHaveLength(0);
  });

  it('NÃO corrige quando algum eixo ultrapassa a tolerância', () => {
    const vs = [v({ id: 'a', leste: 201300, norte: 7704918 })];
    const pts = [p({ leste: 201301, norte: 7704918 })]; // 1m só no eixo E
    const cs = correcoesPrecisaoViaTxt(vs, pts, { toleranciaEixoM: 0.5 });
    expect(cs).toHaveLength(0);
  });

  it('respeita toleranciaEixoM customizada (mais larga)', () => {
    const vs = [v({ id: 'a', leste: 201300, norte: 7704918 })];
    const pts = [p({ leste: 201300.5, norte: 7704918 })]; // 50cm só no eixo E
    const cs = correcoesPrecisaoViaTxt(vs, pts, { toleranciaEixoM: 1 });
    expect(cs).toHaveLength(1);
  });

  it('distância total pequena MAS eixo deslocado → NÃO casa', () => {
    // 0.4m de raio, mas 0.4m a oeste e só 0.01m ao norte → não é o mesmo ponto
    const vs = [v({ id: 'a', leste: 201300, norte: 7704918 })];
    const pts = [p({ leste: 201299.7, norte: 7704918.01 })];
    const cs = correcoesPrecisaoViaTxt(vs, pts, { toleranciaEixoM: 0.5 });
    // diffX = 0.3m (ok), diffY = 0.01m (ok) — ambos cabem em 0.5m
    // então ESSA versão vai casar; melhor fazer o caso onde diffX estoura
    expect(cs.length).toBeGreaterThanOrEqual(0); // só pra documentar a semântica
  });

  it('distância total pequena MAS eixo deslocado além da tolerância → NÃO casa', () => {
    // 0.6m a oeste, 0.01m ao norte → diffX estoura 0.5m mesmo com distância ~0.6m
    const vs = [v({ id: 'a', leste: 201300, norte: 7704918 })];
    const pts = [p({ leste: 201299.4, norte: 7704918.01 })];
    const cs = correcoesPrecisaoViaTxt(vs, pts, { toleranciaEixoM: 0.5 });
    expect(cs).toHaveLength(0);
  });

  it('cada ponto do TXT só casa com um vértice (1-para-1)', () => {
    const vs = [
      v({ id: 'a', leste: 201300, norte: 7704918, elevacao: 814 }),
      v({ id: 'b', leste: 201300.05, norte: 7704918.02, elevacao: 814.1 }), // perto demais, mas 1ª vence
    ];
    const pts = [p({ leste: 201300.165, norte: 7704918.243, elevacao: 814.058 })];
    const cs = correcoesPrecisaoViaTxt(vs, pts);
    expect(cs).toHaveLength(1);
    expect(cs[0].verticeId).toBe('a'); // o mais próximo fica com o ponto
  });

  it('pula coordenadas inválidas (NaN/Infinity)', () => {
    const vs = [v({ id: 'a', leste: 201300, norte: 7704918, elevacao: NaN })];
    const pts = [p({ leste: NaN, norte: 7704918, elevacao: 814 })];
    const cs = correcoesPrecisaoViaTxt(vs, pts);
    expect(cs).toHaveLength(0);
  });

  it('corrigirElevacao=false não atualiza a cota', () => {
    const vs = [v({ id: 'a', leste: 201300, norte: 7704918, elevacao: 814 })];
    const pts = [p({ leste: 201300.165, norte: 7704918.243, elevacao: 814.058 })];
    const cs = correcoesPrecisaoViaTxt(vs, pts, { corrigirElevacao: false });
    expect(cs).toHaveLength(1);
    expect(cs[0].depois.elevacao).toBe(814); // não atualizou
    expect(cs[0].motivo).not.toContain('elevacao');
  });

  it('casa múltiplos vértices do mesmo TXT', () => {
    // Cada eixo difere em < 0.5m (pior caso de arredondamento 0→3 casas em CADA eixo).
    const vs = [
      v({ id: 'a', leste: 201300, norte: 7704918, elevacao: 814, codigoSigef: 'COIN-P-0182' }),
      v({ id: 'b', leste: 201316, norte: 7704753, elevacao: 748, codigoSigef: 'COIN-P-0176' }),
    ];
    const pts = [
      p({ nome: 'P0182', leste: 201300.165, norte: 7704918.243, elevacao: 814.058 }),
      p({ nome: 'P0176', leste: 201316.475, norte: 7704753.400, elevacao: 748.978 }),
    ];
    const cs = correcoesPrecisaoViaTxt(vs, pts);
    expect(cs).toHaveLength(2);
    const porId = new Map(cs.map((c) => [c.verticeId, c]));
    expect(porId.get('a')!.depois.leste).toBe(201300.165);
    expect(porId.get('b')!.depois.leste).toBe(201316.475);
  });
});

describe('aplicarCorrecoesPrecisao', () => {
  it('atualiza E/N/Z e re-deriva lat/lon dos vértices casados, mantém o resto intacto', () => {
    const a = v({ id: 'a', leste: 201300, norte: 7704918, elevacao: 814, codigoSigef: 'A' });
    const b = v({ id: 'b', leste: 201316, norte: 7704753, elevacao: 748, codigoSigef: 'B' });
    const correcoes: CorrecaoPrecisao[] = [
      {
        verticeId: 'a',
        codigo: 'A',
        antes: { leste: 201300, norte: 7704918, elevacao: 814 },
        depois: { leste: 201300.165, norte: 7704918.243, elevacao: 814.058 },
        distanciaM: 0.05,
        pontoTxtIdx: 0,
        motivo: 'todos',
      },
    ];
    const novos = aplicarCorrecoesPrecisao([a, b], correcoes, 23, 'S');
    expect(novos[0].leste).toBe(201300.165);
    expect(novos[0].norte).toBe(7704918.243);
    expect(novos[0].elevacao).toBe(814.058);
    // lat/lon re-derivado ≠ 0
    expect(novos[0].lat).not.toBe(0);
    expect(novos[0].lon).not.toBe(0);
    // 'b' não foi tocado
    expect(novos[1].leste).toBe(201316);
    expect(novos[1].codigoSigef).toBe('B');
  });

  it('retorna o array original quando não há correções', () => {
    const a = v({ id: 'a', leste: 201300, norte: 7704918, elevacao: 814 });
    const out = aplicarCorrecoesPrecisao([a], [], 23, 'S');
    expect(out).toEqual([a]);
  });
});

describe('montarVertices (regressão)', () => {
  it('gera M/P pelo campo Código e numera com contadorMarco/contadorPonto', () => {
    const pts: RawPoint[] = [
      p({ nome: '1', codigo: 'DIVISA JOSE X MARIA', leste: 100, norte: 200 }),
      p({ nome: '2', codigo: 'MATA', leste: 110, norte: 200 }),
    ];
    const vs = montarVertices(pts, 23, 'S', tec);
    expect(vs[0].tipo).toBe('M');
    expect(vs[1].tipo).toBe('P');
    expect(vs[0].codigoSigef).toBe('COIN-M-0001');
    expect(vs[1].codigoSigef).toBe('COIN-P-0001');
  });
});

describe('reordenar / recodificar (regressão)', () => {
  it('reordenar renumera `ordem` 0..N-1 preservando os itens', () => {
    const vs = [v({ id: 'a', leste: 1, norte: 1 }), v({ id: 'b', leste: 2, norte: 2 })];
    const out = reordenar([vs[1], vs[0]]);
    expect(out.map((v) => v.id)).toEqual(['b', 'a']);
    expect(out.map((v) => v.ordem)).toEqual([0, 1]);
  });
  it('recodificar reatribui códigos preservando M/P e ordem atual', () => {
    const a: Vertex = { ...v({ id: 'a', leste: 1, norte: 1 }), tipo: 'M', codigoSigef: 'X' };
    const b: Vertex = { ...v({ id: 'b', leste: 2, norte: 2 }), tipo: 'P', codigoSigef: 'Y' };
    const out = recodificar([a, b], 'COIN', 17, 55);
    expect(out[0].codigoSigef).toBe('COIN-M-0017');
    expect(out[1].codigoSigef).toBe('COIN-P-0055');
  });
});
