import { describe, it, expect } from 'vitest';
import { conferirProntoParaExportar } from './conferenciaExportacao';
import type { Vertex, Confrontante, ImovelData, TecnicoData } from './types';

function vertice(parcial: Partial<Vertex> = {}): Vertex {
  return {
    id: 'v1', ordem: 0, nome: '1', codigoCampo: '', norte: 100, leste: 100, elevacao: 0,
    lat: -20, lon: -42, tipo: 'M', codigoSigef: 'COIN-M-0001', isDivisa: false,
    ...parcial,
  };
}

function imovel(parcial: Partial<ImovelData> = {}): ImovelData {
  return {
    denominacao: 'Fazenda Teste', matricula: '123', cns: '01.234-5', codigoImovelIncra: '',
    proprietario: 'João da Silva', cpfProprietario: '111.444.777-35', tipoPessoa: 'Física',
    municipio: 'Espera Feliz-MG', local: '', naturezaServico: '', situacao: '', naturezaArea: '',
    ...parcial,
  } as ImovelData;
}

const tecnico: TecnicoData = {
  nome: 'Fulano', formacao: '', cft: '', art: '', credenciamentoIncra: 'COIN',
  cidadeAssinatura: '', metodoPosicionamento: 'PG6', tipoLimite: 'LA6',
  contadorMarco: 1, contadorPonto: 1,
};

describe('conferirProntoParaExportar', () => {
  it('aprova um projeto completo', () => {
    const r = conferirProntoParaExportar(imovel(), [vertice(), vertice({ id: 'v2' }), vertice({ id: 'v3' })], [], tecnico);
    expect(r.ok).toBe(true);
    expect(r.problemas).toEqual([]);
  });

  it('reprova com menos de 3 vértices', () => {
    const r = conferirProntoParaExportar(imovel(), [vertice()], [], tecnico);
    expect(r.ok).toBe(false);
    expect(r.problemas.some((p) => p.includes('3 vértices'))).toBe(true);
  });

  it('reprova vértice sem código definitivo', () => {
    const vs = [vertice(), vertice({ id: 'v2', codigoSigef: '' }), vertice({ id: 'v3' })];
    const r = conferirProntoParaExportar(imovel(), vs, [], tecnico);
    expect(r.ok).toBe(false);
    expect(r.problemas.some((p) => p.includes('código definitivo'))).toBe(true);
  });

  it('reprova sem técnico configurado', () => {
    const vs = [vertice(), vertice({ id: 'v2' }), vertice({ id: 'v3' })];
    const r = conferirProntoParaExportar(imovel(), vs, [], null);
    expect(r.ok).toBe(false);
    expect(r.problemas.some((p) => p.includes('responsável técnico'))).toBe(true);
  });

  it('reprova imóvel sem denominação, proprietário ou município', () => {
    const vs = [vertice(), vertice({ id: 'v2' }), vertice({ id: 'v3' })];
    const r = conferirProntoParaExportar(imovel({ denominacao: '', proprietario: '', municipio: '' }), vs, [], tecnico);
    expect(r.problemas.some((p) => p.includes('denominação'))).toBe(true);
    expect(r.problemas.some((p) => p.includes('proprietário'))).toBe(true);
    expect(r.problemas.some((p) => p.includes('município'))).toBe(true);
  });

  it('reprova CPF inválido do proprietário', () => {
    const vs = [vertice(), vertice({ id: 'v2' }), vertice({ id: 'v3' })];
    const r = conferirProntoParaExportar(imovel({ cpfProprietario: '111.111.111-11' }), vs, [], tecnico);
    expect(r.problemas.some((p) => p.includes('CPF/CNPJ do proprietário'))).toBe(true);
  });

  it('reprova confrontante sem nome ou com CPF inválido', () => {
    const vs = [vertice(), vertice({ id: 'v2' }), vertice({ id: 'v3' })];
    const confs: Confrontante[] = [
      { id: 'c1', nome: '', cpf: '', matricula: '', cns: '' },
      { id: 'c2', nome: 'Maria', cpf: '000.000.000-00', matricula: '', cns: '' },
    ];
    const r = conferirProntoParaExportar(imovel(), vs, confs, tecnico);
    expect(r.problemas.some((p) => p.includes('sem nome preenchido'))).toBe(true);
    expect(r.problemas.some((p) => p.includes('Maria'))).toBe(true);
  });
});
