import { describe, it, expect } from 'vitest';
import { gerarGPX } from './gpx';
import type { Vertex, ImovelData } from '../topo/types';

function vertice(parcial: Partial<Vertex> = {}): Vertex {
  return {
    id: 'v1', ordem: 0, nome: '1', codigoCampo: '', norte: 7720000, leste: 290000, elevacao: 850,
    lat: -20.591, lon: -42.003, tipo: 'M', codigoSigef: 'COIN-M-0001', isDivisa: false,
    ...parcial,
  };
}

const imovel: ImovelData = { denominacao: 'Fazenda Teste', matricula: '', cns: '', codigoImovelIncra: '', proprietario: '', cpfProprietario: '', tipoPessoa: 'Física', municipio: '', local: '', naturezaServico: '', situacao: '', naturezaArea: '' } as ImovelData;

describe('gerarGPX', () => {
  it('gera vazio sem vértices', () => {
    expect(gerarGPX([], imovel)).toBe('');
  });

  it('gera um waypoint por vértice com lat/lon válidos', () => {
    const xml = gerarGPX([vertice(), vertice({ id: 'v2', codigoSigef: 'COIN-M-0002', lat: -20.592, lon: -42.004 })], imovel);
    expect((xml.match(/<wpt /g) || []).length).toBe(2);
    expect(xml).toContain('COIN-M-0001');
    expect(xml).toContain('COIN-M-0002');
  });

  it('fecha a trilha voltando ao primeiro ponto', () => {
    const vs = [vertice(), vertice({ id: 'v2', lat: -20.592, lon: -42.004 }), vertice({ id: 'v3', lat: -20.593, lon: -42.005 })];
    const xml = gerarGPX(vs, imovel);
    const trkpts = xml.match(/<trkpt[^>]*>/g) || [];
    expect(trkpts.length).toBe(4); // 3 vértices + repete o primeiro pra fechar
    expect(trkpts[0]).toBe(trkpts[3]);
  });

  it('ignora vértices sem lat/lon válidos', () => {
    const xml = gerarGPX([vertice(), vertice({ id: 'v2', lat: NaN, lon: NaN })], imovel);
    expect((xml.match(/<wpt /g) || []).length).toBe(1);
  });
});
