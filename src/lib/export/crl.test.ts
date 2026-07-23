import { describe, it, expect } from 'vitest';
import { gerarCrlDocumento, gerarCrlLoteDocumento } from './crl';
import type { ImovelData, TecnicoData, Confrontante, Vertex } from '../topo/types';
import { Packer } from 'docx';

describe('Exportação de Carta de Reconhecimento de Limites (CRL - SIGEF/INCRA)', () => {
  const imovelMock = {
    denominacao: 'FAZENDA SANTA MARIA',
    municipio: 'UBERABA',
    uf: 'MG',
    proprietario: 'JOAO DA SILVA',
    cpfProprietario: '123.456.789-00',
    codigoImovelIncra: '950.082.014.218-9',
    matricula: '12.345',
  } as ImovelData;

  const tecnicoMock = {
    nome: 'CARLOS ALBERTO MEDEIROS',
    formacao: 'ENGENHEIRO AGRIMENSOR',
    cft: 'CREA-MG 123456',
    art: 'ART-2026-9999',
    credenciamentoIncra: 'ABC1',
    cidadeAssinatura: 'UBERABA',
  } as unknown as TecnicoData;

  const confrontanteMock = {
    id: 'conf1',
    nome: 'MANOEL PEREIRA',
    cpf: '987.654.321-11',
    matricula: '54.321',
    estadoCivil: 'casado',
    conjugeNome: 'MARIA PEREIRA',
    conjugeCpf: '111.222.333-44',
    condicao: 'proprietario',
  } as Confrontante;

  const v1 = { id: 'v1', ordem: 1, nome: 'M-001', codigoSigef: 'ABC-M-001', tipo: 'M', leste: 200000, norte: 7800000, lat: -19.9, lon: -47.9 } as Vertex;
  const v2 = { id: 'v2', ordem: 2, nome: 'M-002', codigoSigef: 'ABC-M-002', tipo: 'M', leste: 200500, norte: 7800200, lat: -19.89, lon: -47.89 } as Vertex;

  it('gerarCrlDocumento deve criar o objeto Document sem exceções', async () => {
    const doc = gerarCrlDocumento({
      imovel: imovelMock,
      tecnico: tecnicoMock,
      confrontante: confrontanteMock,
      verticesCompartilhados: [{ de: v1, para: v2, distancia: 538.52 }],
      dataExtenso: '23 de julho de 2026',
      incluirTabelaVertices: true,
    });
    expect(doc).toBeDefined();
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('gerarCrlLoteDocumento deve criar o documento em lote sem lançar erros', async () => {
    const docLote = gerarCrlLoteDocumento([
      {
        imovel: imovelMock,
        tecnico: tecnicoMock,
        confrontante: confrontanteMock,
        verticesCompartilhados: [{ de: v1, para: v2, distancia: 538.52 }],
      },
    ]);
    expect(docLote).toBeDefined();
    const buffer = await Packer.toBuffer(docLote);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
