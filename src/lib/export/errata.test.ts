import { describe, it, expect } from 'vitest';
import { gerarErrataDocx } from './errata';
import type { ImovelData, TecnicoData } from '../topo/types';

const imovel = { denominacao: 'Sítio Boa Vista', matricula: '1234', municipio: 'Espera Feliz-MG', local: 'Córrego Boa Vista', proprietario: 'Fulano' } as ImovelData;
const tecnico = { nome: 'Darlan Souza', formacao: 'Técnico em Agrimensura', cft: '123-MG', credenciamentoIncra: 'COIN' } as TecnicoData;

describe('gerarErrataDocx', () => {
  it('gera um .docx (Blob não vazio) com correções', async () => {
    const blob = await gerarErrataDocx({
      imovel, tecnico, areaHa: 6.064,
      correcoes: [{ onde: 'Confrontante João', constava: 'Matrícula nº 111', passa: 'Matrícula nº 222' }],
      dataExtenso: '29 de junho de 2026',
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('funciona mesmo sem correções e com acréscimo de RT', async () => {
    const blob = await gerarErrataDocx({ imovel, tecnico, areaHa: 2.8899, correcoes: [], acrescimoRT: 'Número CFT 2605638774' });
    expect(blob.size).toBeGreaterThan(0);
  });
});
