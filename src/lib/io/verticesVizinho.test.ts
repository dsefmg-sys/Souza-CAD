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

  it('lê sigma X/Y e método quando as colunas estão mapeadas', () => {
    const cfg: ImportVerticesVizinhoConfig = {
      separador: ';', decimal: '.', temCabecalho: true,
      colunas: ['nome', 'latitude', 'longitude', 'sigmaX', 'sigmaY', 'metodo'],
    };
    const conteudo = [
      'Vertice;Lat;Lon;SigX;SigY;Metodo',
      'CODI-M-0012;-20.456123;-41.815234;0.012;0.015;PG6',
    ].join('\n');
    const out = parseVerticesVizinho(conteudo, cfg, 23, 'S');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ nome: 'CODI-M-0012', sigmaX: 0.012, sigmaY: 0.015, metodo: 'PG6' });
  });

  it('não inclui sigma quando as colunas não estão mapeadas', () => {
    const cfg: ImportVerticesVizinhoConfig = {
      separador: ';', decimal: '.', temCabecalho: true,
      colunas: ['nome', 'latitude', 'longitude'],
    };
    const conteudo = 'Vertice;Lat;Lon\nCODI-M-0012;-20.4;-41.8';
    const out = parseVerticesVizinho(conteudo, cfg, 23, 'S');
    expect(out[0].sigmaX).toBeUndefined();
    expect(out[0].metodo).toBeUndefined();
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

  it('detecta e parseia automaticamente o formato de CSV oficial do SIGEF', () => {
    const csv = [
      'ORCODE,CODIGO,METODO_POSICIONAMENTO,TIPO_VERTICE,SIGMA_X,SIGMA_Y,SIGMA_Z,LADO,INDICE,X,Y,Z,GEOMETRIA_WKT',
      '02ce9434,COIN-M-0017,PG6,M,0.08,0.08,0.01,EXTERNO,1,42 00 03.045 W,20 35 26.152 S,898.97,POINT (-42.000846109999977 -20.590597779999995)',
      '02ce9434,COIN-P-0055,PG6,P,0.08,0.08,0.01,EXTERNO,2,42 00 02.188 W,20 35 27.873 S,920.67,POINT (-42.000608 -20.591076)'
    ].join('\n');
    
    // Passa um config qualquer, pois deve ignorá-lo e auto-detectar
    const dummyCfg: ImportVerticesVizinhoConfig = {
      separador: ';', decimal: '.', temCabecalho: true,
      colunas: ['nome', 'latitude', 'longitude'],
    };
    
    const out = parseVerticesVizinho(csv, dummyCfg, 23, 'S');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      nome: 'COIN-M-0017',
      lat: -20.590597779999995,
      lon: -42.000846109999977,
      elevacao: 898.97,
      sigmaX: 0.08,
      sigmaY: 0.08,
      sigmaZ: 0.01,
      metodo: 'PG6'
    });
    expect(out[1]).toMatchObject({
      nome: 'COIN-P-0055',
      lat: -20.591076,
      lon: -42.000608,
      elevacao: 920.67,
      sigmaX: 0.08,
      sigmaY: 0.08,
      sigmaZ: 0.01,
      metodo: 'PG6'
    });
  });
});
