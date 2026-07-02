import { describe, it, expect } from 'vitest';
import { conferirProntoParaExportar, conferirProjetoGlebas } from './conferenciaExportacao';
import type { Vertex, Confrontante, ImovelData, TecnicoData, Gleba } from './types';

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

function tresVertices(): Vertex[] {
  return [vertice(), vertice({ id: 'v2', codigoSigef: 'COIN-M-0002' }), vertice({ id: 'v3', codigoSigef: 'COIN-M-0003' })];
}

const tecnico: TecnicoData = {
  nome: 'Fulano', formacao: '', cft: '', art: '', credenciamentoIncra: 'COIN',
  cidadeAssinatura: '', metodoPosicionamento: 'PG6', tipoLimite: 'LA6',
  contadorMarco: 1, contadorPonto: 1,
};

describe('conferirProntoParaExportar', () => {
  it('aprova um projeto completo', () => {
    const r = conferirProntoParaExportar(imovel(), tresVertices(), [], tecnico);
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
    const r = conferirProntoParaExportar(imovel(), tresVertices(), [], null);
    expect(r.ok).toBe(false);
    expect(r.problemas.some((p) => p.includes('responsável técnico'))).toBe(true);
  });

  it('reprova imóvel sem denominação, proprietário ou município', () => {
    const r = conferirProntoParaExportar(imovel({ denominacao: '', proprietario: '', municipio: '' }), tresVertices(), [], tecnico);
    expect(r.problemas.some((p) => p.includes('denominação'))).toBe(true);
    expect(r.problemas.some((p) => p.includes('proprietário'))).toBe(true);
    expect(r.problemas.some((p) => p.includes('município'))).toBe(true);
  });

  it('reprova CPF inválido do proprietário', () => {
    const r = conferirProntoParaExportar(imovel({ cpfProprietario: '111.111.111-11' }), tresVertices(), [], tecnico);
    expect(r.problemas.some((p) => p.includes('CPF/CNPJ do proprietário'))).toBe(true);
  });

  it('avisa (sem travar) quando o cônjuge do proprietário está preenchido sem CPF', () => {
    const r = conferirProntoParaExportar(imovel({ conjugeProprietario: 'Maria', cpfConjugeProprietario: '' }), tresVertices(), [], tecnico);
    expect(r.problemas.some((p) => p.includes('cônjuge do proprietário'))).toBe(true);
    expect(r.graves).toEqual([]);
  });

  it('reprova vértices com código SIGEF repetido', () => {
    const vs = [vertice(), vertice({ id: 'v2', codigoSigef: 'COIN-M-0001' }), vertice({ id: 'v3', codigoSigef: 'COIN-M-0003' })];
    const r = conferirProntoParaExportar(imovel(), vs, [], tecnico);
    expect(r.ok).toBe(false);
    expect(r.problemas.some((p) => p.includes('código repetido') && p.includes('COIN-M-0001'))).toBe(true);
  });

  it('reprova confrontante sem nome ou com CPF inválido', () => {
    const confs: Confrontante[] = [
      { id: 'c1', nome: '', cpf: '', matricula: '', cns: '' },
      { id: 'c2', nome: 'Maria', cpf: '000.000.000-00', matricula: '', cns: '' },
    ];
    const r = conferirProntoParaExportar(imovel(), tresVertices(), confs, tecnico);
    expect(r.problemas.some((p) => p.includes('sem nome preenchido'))).toBe(true);
    expect(r.problemas.some((p) => p.includes('Maria'))).toBe(true);
  });
});

describe('conferirProntoParaExportar — severidade (graves travam de verdade, leves só avisam)', () => {
  it('geometria incompleta (menos de 3 vértices) é GRAVE', () => {
    const r = conferirProntoParaExportar(imovel(), [vertice()], [], tecnico);
    expect(r.graves.some((p) => p.includes('3 vértices'))).toBe(true);
  });

  it('vértice sem código definitivo é GRAVE', () => {
    const vs = [vertice(), vertice({ id: 'v2', codigoSigef: '' }), vertice({ id: 'v3' })];
    const r = conferirProntoParaExportar(imovel(), vs, [], tecnico);
    expect(r.graves.some((p) => p.includes('código definitivo'))).toBe(true);
  });

  it('código de vértice repetido é GRAVE (SIGEF rejeitaria)', () => {
    const vs = [vertice(), vertice({ id: 'v2', codigoSigef: 'COIN-M-0001' }), vertice({ id: 'v3', codigoSigef: 'COIN-M-0003' })];
    const r = conferirProntoParaExportar(imovel(), vs, [], tecnico);
    expect(r.graves.some((p) => p.includes('código repetido'))).toBe(true);
  });

  it('campo de cadastro faltando (denominação/proprietário/município) NÃO é grave — só aviso', () => {
    const r = conferirProntoParaExportar(imovel({ denominacao: '', proprietario: '', municipio: '' }), tresVertices(), [], tecnico);
    expect(r.graves).toEqual([]);
    expect(r.problemas.length).toBeGreaterThan(0);
  });

  it('CPF com cara de inválido NÃO é grave — só aviso', () => {
    const r = conferirProntoParaExportar(imovel({ cpfProprietario: '111.111.111-11' }), tresVertices(), [], tecnico);
    expect(r.graves).toEqual([]);
  });

  it('espólio sem inventariante é GRAVE (assinatura sairia em branco no memorial)', () => {
    const confs: Confrontante[] = [{ id: 'c1', nome: 'Espólio de Zeca', cpf: '', matricula: '', cns: '', condicao: 'espolio' }];
    const r = conferirProntoParaExportar(imovel(), tresVertices(), confs, tecnico);
    expect(r.graves.some((p) => p.includes('inventariante'))).toBe(true);
  });

  it('espólio COM inventariante não acusa problema', () => {
    const confs: Confrontante[] = [{ id: 'c1', nome: 'Espólio de Zeca', cpf: '', matricula: '', cns: '', condicao: 'espolio', inventarianteNome: 'Maria Inventariante' }];
    const r = conferirProntoParaExportar(imovel(), tresVertices(), confs, tecnico);
    expect(r.graves.some((p) => p.includes('inventariante'))).toBe(false);
  });

  it('trecho do perímetro sem confrontante atribuído é GRAVE (memorial narraria "confrontante não informado")', () => {
    const confs: Confrontante[] = [{ id: 'c1', nome: 'Vizinho', cpf: '', matricula: '', cns: '' }];
    const porLado = { 0: 'c1', 1: 'c1' }; // falta o lado 2
    const r = conferirProntoParaExportar(imovel(), tresVertices(), confs, tecnico, porLado);
    expect(r.graves.some((p) => p.includes('confrontante não informado'))).toBe(true);
  });

  it('todos os trechos com confrontante atribuído não acusa problema', () => {
    const confs: Confrontante[] = [{ id: 'c1', nome: 'Vizinho', cpf: '', matricula: '', cns: '' }];
    const porLado = { 0: 'c1', 1: 'c1', 2: 'c1' };
    const r = conferirProntoParaExportar(imovel(), tresVertices(), confs, tecnico, porLado);
    expect(r.graves).toEqual([]);
  });

  it('confrontante cadastrado mas não atribuído a nenhum trecho gera aviso (não grave)', () => {
    const confs: Confrontante[] = [
      { id: 'c1', nome: 'Vizinho Usado', cpf: '', matricula: '', cns: '' },
      { id: 'c2', nome: 'Vizinho Esquecido', cpf: '', matricula: '', cns: '' },
    ];
    const porLado = { 0: 'c1', 1: 'c1', 2: 'c1' };
    const r = conferirProntoParaExportar(imovel(), tresVertices(), confs, tecnico, porLado);
    expect(r.graves).toEqual([]);
    expect(r.problemas.some((p) => p.includes('Vizinho Esquecido') && p.includes('não foi atribuído'))).toBe(true);
  });
});

describe('conferirProjetoGlebas (multi-gleba)', () => {
  const vizinho: Confrontante = { id: 'cz', nome: 'Vizinho', cpf: '', matricula: '', cns: '' };
  function gleba(nome: string, vs: Vertex[]): Gleba {
    const porLado: Record<number, string> = {};
    vs.forEach((_, i) => { porLado[i] = 'cz'; });
    return { id: `g_${nome}`, denominacao: nome, parcela: '001', vertices: vs, confrontantes: [vizinho], confrontantePorLado: porLado };
  }

  it('NÃO acusa código repetido quando duas glebas vizinhas compartilham vértices de divisa (mesmo código, correto no SIGEF)', () => {
    const divisa1 = vertice({ id: 'd1', codigoSigef: 'COIN-M-0010' });
    const divisa2 = vertice({ id: 'd2', codigoSigef: 'COIN-M-0011' });
    const gA = gleba('Parcela 1', [vertice({ id: 'a1', codigoSigef: 'COIN-M-0001' }), divisa1, divisa2]);
    const gB = gleba('Parcela 2', [vertice({ id: 'b1', codigoSigef: 'COIN-M-0002' }), { ...divisa1, id: 'd1b' }, { ...divisa2, id: 'd2b' }]);
    const r = conferirProjetoGlebas(imovel(), [gA, gB], tecnico);
    expect(r.graves).toEqual([]);
  });

  it('acusa código repetido DENTRO da mesma gleba', () => {
    const g = gleba('Parcela 1', [vertice(), vertice({ id: 'v2', codigoSigef: 'COIN-M-0001' }), vertice({ id: 'v3', codigoSigef: 'COIN-M-0003' })]);
    const r = conferirProjetoGlebas(imovel(), [g], tecnico);
    expect(r.graves.some((p) => p.includes('código repetido'))).toBe(true);
  });

  it('prefixa as mensagens com o nome da gleba quando há mais de uma', () => {
    const gOk = gleba('Parcela 1', tresVertices());
    const gRuim = gleba('Parcela 2', [vertice({ id: 'x1', codigoSigef: 'COIN-M-0021' })]);
    const r = conferirProjetoGlebas(imovel(), [gOk, gRuim], tecnico);
    expect(r.graves.some((p) => p.startsWith('[Parcela 2]') && p.includes('3 vértices'))).toBe(true);
  });

  it('não prefixa quando o projeto tem uma gleba só', () => {
    const g = gleba('Parcela 1', [vertice({ id: 'x1', codigoSigef: 'COIN-M-0021' })]);
    const r = conferirProjetoGlebas(imovel(), [g], tecnico);
    expect(r.graves.some((p) => p.startsWith('A poligonal'))).toBe(true);
  });

  it('checagens de cadastro (imóvel/técnico) aparecem uma vez só, sem repetir por gleba', () => {
    const gA = gleba('Parcela 1', tresVertices());
    const gB = gleba('Parcela 2', [vertice({ id: 'b1', codigoSigef: 'COIN-M-0031' }), vertice({ id: 'b2', codigoSigef: 'COIN-M-0032' }), vertice({ id: 'b3', codigoSigef: 'COIN-M-0033' })]);
    const r = conferirProjetoGlebas(imovel({ municipio: '' }), [gA, gB], tecnico);
    expect(r.problemas.filter((p) => p.includes('município')).length).toBe(1);
  });

  it('projeto sem nenhuma gleba é grave', () => {
    const r = conferirProjetoGlebas(imovel(), [], tecnico);
    expect(r.graves.some((p) => p.includes('nenhuma gleba'))).toBe(true);
  });
});
