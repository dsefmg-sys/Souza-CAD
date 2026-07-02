import { describe, it, expect } from 'vitest';
import { novaGlebaVazia, glebaDe, migrarProjeto, dividirGleba, unirGlebas, dividirPorAreaAlvo } from './glebas';
import type { Projeto, Vertex } from './types';

const baseProj: Omit<Projeto, 'glebas' | 'vertices' | 'confrontantes' | 'confrontantePorLado'> = {
  id: 'p1', nome: 'Teste', criadoEm: 1, atualizadoEm: 1,
  imovel: {
    denominacao: 'Faz', matricula: '1', cns: '', codigoImovelIncra: '', proprietario: '',
    cpfProprietario: '', tipoPessoa: 'Física', municipio: '', local: '',
    naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
  },
  zonaUtm: 23, hemisferio: 'S',
};

describe('glebas', () => {
  it('novaGlebaVazia numera a parcela com zero à esquerda', () => {
    expect(novaGlebaVazia(1).parcela).toBe('001');
    expect(novaGlebaVazia(2).denominacao).toBe('Parcela 2');
  });

  it('divide por área alvo: quadrado 100x100 (1 ha) em 0,4 ha + 0,6 ha', () => {
    const quadrado = [
      { leste: 0, norte: 0 }, { leste: 100, norte: 0 },
      { leste: 100, norte: 100 }, { leste: 0, norte: 100 },
    ];
    // corte paralelo ao azimute 90° (linha leste-oeste), varrendo no eixo Norte
    const r = dividirPorAreaAlvo(quadrado, 4000, 90);
    expect(Math.abs(r.areaA - 4000)).toBeLessThan(1);
    expect(Math.abs(r.areaB - 6000)).toBeLessThan(1);
    expect(Math.abs(r.areaA + r.areaB - 10000)).toBeLessThan(1);
  });

  it('divide por área alvo rejeita alvo >= área total', () => {
    const quadrado = [
      { leste: 0, norte: 0 }, { leste: 100, norte: 0 },
      { leste: 100, norte: 100 }, { leste: 0, norte: 100 },
    ];
    expect(() => dividirPorAreaAlvo(quadrado, 10000, 90)).toThrow();
  });

  it('migra projeto legado (vertices no topo) para glebas[0]', () => {
    const vert = [{ id: 'v1' } as never];
    const legado = { ...baseProj, vertices: vert, confrontantes: [], confrontantePorLado: { 0: 'c1' } } as unknown as Projeto;
    const mig = migrarProjeto(legado);
    expect(mig.glebas).toHaveLength(1);
    expect(mig.glebas[0].vertices).toBe(vert);
    expect(mig.glebas[0].confrontantePorLado).toEqual({ 0: 'c1' });
  });

  it('não mexe em projeto que já tem glebas', () => {
    const g = glebaDe(1, [], [], {}, 'Parcela 1');
    const novo = { ...baseProj, glebas: [g] } as Projeto;
    expect(migrarProjeto(novo).glebas).toBe(novo.glebas);
  });

  it('dividirGleba divide polígono em duas glebas por dois vértices', () => {
    const v = [
      { id: 'v0', nome: 'V0', leste: 0, norte: 0, lat: 0, lon: 0 },
      { id: 'v1', nome: 'V1', leste: 10, norte: 0, lat: 0, lon: 0 },
      { id: 'v2', nome: 'V2', leste: 10, norte: 10, lat: 0, lon: 0 },
      { id: 'v3', nome: 'V3', leste: 0, norte: 10, lat: 0, lon: 0 },
    ] as unknown as Vertex[];
    const confPorLado = { 0: 'c0', 1: 'c1', 2: 'c2', 3: 'c3' };

    // Divide conectando v1 e v3
    const { verticesA, confrontantePorLadoA, verticesB, confrontantePorLadoB } = dividirGleba(v, [], confPorLado, 'v1', 'v3');
    
    expect(verticesA).toHaveLength(3); // v1, v2, v3
    expect(verticesB).toHaveLength(3); // v3, v0, v1

    expect(confrontantePorLadoA[0]).toBe('c1'); // v1 -> v2
    expect(confrontantePorLadoA[1]).toBe('c2'); // v2 -> v3
    expect(confrontantePorLadoA[2]).toBe(''); // v3 -> v1 (linha nova)

    expect(confrontantePorLadoB[0]).toBe('c3'); // v3 -> v0
    expect(confrontantePorLadoB[1]).toBe('c0'); // v0 -> v1
    expect(confrontantePorLadoB[2]).toBe(''); // v1 -> v3 (linha nova)
  });

  it('unirGlebas funde duas glebas adjacentes pela divisa comum', () => {
    const va = [
      { id: 'va0', nome: 'A0', leste: 0, norte: 0, lat: 0, lon: 0 },
      { id: 'va1', nome: 'A1', leste: 10, norte: 0, lat: 0, lon: 0 },
      { id: 'va2', nome: 'A2', leste: 10, norte: 10, lat: 0, lon: 0 },
      { id: 'va3', nome: 'A3', leste: 0, norte: 10, lat: 0, lon: 0 },
    ] as unknown as Vertex[];
    // Gleba B ao lado direito de A: compartilha a divisa A1->A2
    const vb = [
      { id: 'vb0', nome: 'B0', leste: 10, norte: 0, lat: 0, lon: 0 },
      { id: 'vb1', nome: 'B1', leste: 20, norte: 0, lat: 0, lon: 0 },
      { id: 'vb2', nome: 'B2', leste: 20, norte: 10, lat: 0, lon: 0 },
      { id: 'vb3', nome: 'B3', leste: 10, norte: 10, lat: 0, lon: 0 },
    ] as unknown as Vertex[];

    const confA = { 0: 'c_sul_A', 1: 'c_divisa', 2: 'c_norte_A', 3: 'c_oeste_A' };
    const confB = { 0: 'c_sul_B', 1: 'c_leste_B', 2: 'c_norte_B', 3: 'c_divisa' };

    const { vertices, confrontantePorLado } = unirGlebas(va, vb, confA, confB);

    expect(vertices).toHaveLength(6);
    // Verifica que o ponto da divisa comum foi contornado exteriormente:
    // Deve conter (0,0) -> (10,0) -> (20,0) -> (20,10) -> (10,10) -> (0,10)
    const coords = vertices.map(x => `${x.leste},${x.norte}`);
    expect(coords).toContain('0,0');
    expect(coords).toContain('10,0');
    expect(coords).toContain('20,0');
    expect(coords).toContain('20,10');
    expect(coords).toContain('10,10');
    expect(coords).toContain('0,10');
  });

  it('unirGlebas recusa glebas sem divisa comum', () => {
    const va = [
      { id: 'va0', nome: 'A0', leste: 0, norte: 0, lat: 0, lon: 0 },
      { id: 'va1', nome: 'A1', leste: 10, norte: 0, lat: 0, lon: 0 },
      { id: 'va2', nome: 'A2', leste: 10, norte: 10, lat: 0, lon: 0 },
    ] as unknown as Vertex[];
    const vb = [
      { id: 'vb0', nome: 'B0', leste: 100, norte: 100, lat: 0, lon: 0 },
      { id: 'vb1', nome: 'B1', leste: 110, norte: 100, lat: 0, lon: 0 },
      { id: 'vb2', nome: 'B2', leste: 110, norte: 110, lat: 0, lon: 0 },
    ] as unknown as Vertex[];
    expect(() => unirGlebas(va, vb, {}, {})).toThrow(/divisa comum/);
  });
});
