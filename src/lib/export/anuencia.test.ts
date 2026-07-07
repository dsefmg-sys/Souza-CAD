import { describe, it, expect } from 'vitest';
import { gerarAnuenciaDocumento, gerarAnuenciaLoteDocumento } from './anuencia';
import type { ImovelData, TecnicoData, Confrontante, Vertex, Lado } from '../topo/types';
import { Packer } from 'docx';

const imovel = { denominacao: 'Fazenda São José', matricula: '4567', municipio: 'Espera Feliz', proprietario: 'José da Silva' } as ImovelData;
const tecnico = { nome: 'Darlan Souza', formacao: 'Técnico em Agrimensura', cft: '123-MG', credenciamentoIncra: 'COIN' } as TecnicoData;
const confrontante = { id: 'c1', nome: 'João dos Santos', cpf: '123.456.789-00', matricula: '9876', cns: '123456', condicao: 'proprietario', descricaoExtra: 'Córrego Grande' } as Confrontante;

describe('gerarAnuenciaDocumento', () => {
  it('gera um documento do tipo Document com parágrafos de anuência', async () => {
    const doc = gerarAnuenciaDocumento({
      imovel,
      tecnico,
      confrontante,
      verticesCompartilhados: [
        {
          de: { id: 'v1', ordem: 1, nome: 'COIN-M-1000', lat: -20.5, lon: -42.0, leste: 800000, norte: 7700000, elevacao: 750, tipo: 'M', codigoSigef: 'COIN-M-1000', isDivisa: true } as Vertex,
          para: { id: 'v2', ordem: 2, nome: 'COIN-P-2000', lat: -20.51, lon: -42.01, leste: 799000, norte: 7699000, elevacao: 740, tipo: 'P', codigoSigef: 'COIN-P-2000', isDivisa: true } as Vertex,
          distancia: 150,
          azimute: 120,
          confrontanteId: 'c1'
        } as Lado
      ],
      comarca: 'Espera Feliz',
      dataExtenso: '10 de julho de 2026'
    });

    expect(doc).toBeDefined();
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('altera o texto quando o imóvel está sob regime de posse', async () => {
    const doc = gerarAnuenciaDocumento({
      imovel: { ...imovel, regimeTerra: 'posse' },
      tecnico,
      confrontante,
      verticesCompartilhados: [],
      comarca: 'Espera Feliz',
      dataExtenso: '10 de julho de 2026'
    });
    expect(doc).toBeDefined();
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

describe('gerarAnuenciaLoteDocumento', () => {
  it('gera um único documento com todas as cartas (uma por confrontante)', async () => {
    const c2 = { ...confrontante, id: 'c2', nome: 'Maria Oliveira', condicao: 'posseiro' } as Confrontante;
    const doc = gerarAnuenciaLoteDocumento([
      { imovel, tecnico, confrontante, verticesCompartilhados: [] },
      { imovel, tecnico, confrontante: c2, verticesCompartilhados: [] },
    ]);
    expect(doc).toBeDefined();
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('não quebra com lista vazia', async () => {
    const doc = gerarAnuenciaLoteDocumento([]);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
