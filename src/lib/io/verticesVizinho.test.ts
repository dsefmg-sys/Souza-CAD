import { describe, it, expect } from 'vitest';
import { parseVerticesVizinho } from './verticesVizinho';
import type { ImportVerticesVizinhoConfig } from '../topo/types';

describe('parseVerticesVizinho', () => {
  it('lê nome + latitude/longitude (coordenada geográfica)', () => {
    const cfg: ImportVerticesVizinhoConfig = {
      separador: ';', decimal: '.', temCabecalho: true,
      colunas: ['nome', 'latitude', 'longitude'],
    };
    const conteudo = [
      'Vertice;Lat;Lon',
      'CODI-M-0012;-20.456123;-41.815234',
      'CODI-P-0013;-20.457889;-41.816112',
    ].join('\n');
    const out = parseVerticesVizinho(conteudo, cfg, 23, 'S');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ nome: 'CODI-M-0012', lat: -20.456123, lon: -41.815234 });
    expect(out[1].nome).toBe('CODI-P-0013');
  });

  it('lê nome + leste/norte (UTM) e converte para lat/lon usando a zona informada', () => {
    const cfg: ImportVerticesVizinhoConfig = {
      separador: ';', decimal: ',', temCabecalho: false,
      colunas: ['nome', 'leste', 'norte'],
    };
    const conteudo = 'CODI-P-0007;812375,20;7720123,45';
    const out = parseVerticesVizinho(conteudo, cfg, 23, 'S');
    expect(out).toHaveLength(1);
    expect(out[0].nome).toBe('CODI-P-0007');
    // reprojetado para geográfico: perto da região de Espera Feliz-MG (lat negativa, lon negativa)
    expect(out[0].lat).toBeLessThan(0);
    expect(out[0].lon).toBeLessThan(0);
  });

  it('ignora linhas sem coordenada válida e respeita colunas marcadas como ignorar', () => {
    const cfg: ImportVerticesVizinhoConfig = {
      separador: ';', decimal: '.', temCabecalho: true,
      colunas: ['ignorar', 'nome', 'latitude', 'longitude'],
    };
    const conteudo = [
      'Seq;Vertice;Lat;Lon',
      '1;CODI-M-0001;-20.1;-41.1',
      '2;CODI-M-0002;abc;-41.2', // coordenada inválida — deve ser descartada
    ].join('\n');
    const out = parseVerticesVizinho(conteudo, cfg, 23, 'S');
    expect(out).toHaveLength(1);
    expect(out[0].nome).toBe('CODI-M-0001');
  });
});
