import { describe, it, expect } from 'vitest';
import type { Vertex } from './types';
import { semente, atribuirProvisorio, atribuirDefinitivo } from './registroCore';

function v(tipo: 'M' | 'P' | 'V', extra: Partial<Vertex> = {}): Vertex {
  return {
    id: Math.random().toString(36), ordem: 0, nome: '', codigoCampo: '',
    norte: 0, leste: 0, elevacao: 0, lat: 0, lon: 0, tipo, codigoSigef: '', isDivisa: tipo === 'M',
    ...extra,
  };
}

const tec = { contadorMarco: 17, contadorPonto: 55, contadorVirtual: 1 };

describe('banco de pontos — provisório', () => {
  it('numera M/P/V na ordem a partir das sementes', () => {
    const c = semente('COIN', tec);
    const vs = atribuirProvisorio([v('M'), v('P'), v('P'), v('M'), v('V')], c);
    expect(vs.map((x) => x.codigoSigef)).toEqual([
      'COIN-M-0017', 'COIN-P-0055', 'COIN-P-0056', 'COIN-M-0018', 'COIN-V-0001',
    ]);
  });
  it('não consome os contadores (é só pré-visualização)', () => {
    const c = semente('COIN', tec);
    atribuirProvisorio([v('M'), v('M')], c);
    expect(c.M).toBe(17);
  });

  it('NÃO repete o número de um vértice já registrado ao numerar os provisórios', () => {
    const c = semente('COIN', { contadorMarco: 5, contadorPonto: 1 });
    const reg = v('M', { codigoSigef: 'COIN-M-0005', registrado: true });
    const out = atribuirProvisorio([v('M'), reg, v('M')], c);
    const codigos = out.map((x) => x.codigoSigef);
    expect(codigos).toContain('COIN-M-0005'); // o registrado
    // os provisórios não podem repetir o 0005
    expect(codigos.filter((cd) => cd === 'COIN-M-0005')).toHaveLength(1);
    expect(new Set(codigos).size).toBe(3); // todos distintos
  });

  it('PRESERVA a marca registrado ao renumerar (não pode reconsumir número)', () => {
    const c = semente('COIN', tec);
    const reg = v('M', { codigoSigef: 'COIN-M-0005', registrado: true });
    const novo = v('P');
    const out = atribuirProvisorio([reg, novo], c);
    expect(out[0].registrado).toBe(true);       // mantém registrado
    expect(out[0].codigoSigef).toBe('COIN-M-0005'); // mantém código
    expect(out[1].registrado).toBeFalsy();       // novo continua não registrado
  });
});

describe('banco de pontos — definitivo (nunca repete)', () => {
  it('consome e gera registros só para vértices novos', () => {
    const c = semente('COIN', tec);
    const r = atribuirDefinitivo([v('M'), v('P')], c, 'imovel-1', 23, 'S', 1000);
    expect(r.vertices.map((x) => x.codigoSigef)).toEqual(['COIN-M-0017', 'COIN-P-0055']);
    expect(r.vertices.every((x) => x.registrado)).toBe(true);
    expect(r.contadores).toMatchObject({ M: 18, P: 56, V: 1 });
    expect(r.pontos).toHaveLength(2);
    expect(r.pontos[0]).toMatchObject({ codigo: 'COIN-M-0017', imovelId: 'imovel-1', zonaUtm: 23 });
  });

  it('um vértice já registrado não consome de novo', () => {
    const c = semente('COIN', tec);
    const jaReg = v('M', { codigoSigef: 'COIN-M-0009', registrado: true });
    const r = atribuirDefinitivo([jaReg, v('P')], c, 'imovel-1', 23, 'S', 1000);
    expect(r.vertices[0].codigoSigef).toBe('COIN-M-0009'); // mantém
    expect(r.contadores.M).toBe(17); // M não avançou
    expect(r.contadores.P).toBe(56);
    expect(r.pontos).toHaveLength(1); // só o P novo
  });

  it('registros sucessivos nunca reusam número (simulando 2 imóveis)', () => {
    let c = semente('COIN', tec);
    const r1 = atribuirDefinitivo([v('M'), v('M')], c, 'a', 23, 'S', 1);
    c = r1.contadores;
    const r2 = atribuirDefinitivo([v('M')], c, 'b', 23, 'S', 2);
    const usados = [...r1.pontos, ...r2.pontos].map((p) => p.codigo);
    expect(new Set(usados).size).toBe(usados.length); // todos distintos
    expect(r2.pontos[0].codigo).toBe('COIN-M-0019');
  });
});
