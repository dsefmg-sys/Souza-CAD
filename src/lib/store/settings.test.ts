import { vi, describe, it, expect, beforeEach } from 'vitest';

// Simular objeto window e localStorage para rodar no ambiente de teste do Node
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => {
    for (const key in storage) {
      delete storage[key];
    }
  },
};

// Injetar globais
global.window = {
  localStorage: mockLocalStorage,
} as unknown as Window & typeof globalThis;

global.localStorage = mockLocalStorage as unknown as Storage;

import {
  carregarImportTxt,
  salvarImportTxt,
  carregarImportVerticesVizinho,
  salvarImportVerticesVizinho,
  carregarEscritorio,
  salvarEscritorio,
  carregarTecnico,
  salvarTecnico,
  proximoNumeroReciboSeq,
  definirNumeroReciboSeq,
  consumirNumeroRecibo,
  IMPORT_TXT_PADRAO,
  IMPORT_VIZINHO_PADRAO,
  ESCRITORIO_PADRAO,
  TECNICO_PADRAO,
} from './settings';

describe('Settings Store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Import TXT Config', () => {
    it('retorna configuração padrão se vazio', () => {
      expect(carregarImportTxt()).toEqual(IMPORT_TXT_PADRAO);
    });

    it('salva e carrega a configuração com sucesso', () => {
      const custom = { ...IMPORT_TXT_PADRAO, separador: ',', decimal: ',' as const };
      salvarImportTxt(custom);
      expect(carregarImportTxt()).toEqual(custom);
    });
  });

  describe('Import Vizinho Config', () => {
    it('retorna configuração padrão se vazio', () => {
      expect(carregarImportVerticesVizinho()).toEqual(IMPORT_VIZINHO_PADRAO);
    });

    it('salva e carrega a configuração com sucesso', () => {
      const custom = { ...IMPORT_VIZINHO_PADRAO, separador: 'tab' as const };
      salvarImportVerticesVizinho(custom);
      expect(carregarImportVerticesVizinho()).toEqual(custom);
    });
  });

  describe('Escritorio (Empresa) Config', () => {
    it('retorna valores padrão se vazio', () => {
      expect(carregarEscritorio()).toEqual(ESCRITORIO_PADRAO);
    });

    it('salva e carrega escritório com sucesso', () => {
      const custom = {
        nome: 'Empresa Teste LTDA',
        cnpj: '12.345.678/0001-99',
        ramo: 'Topografia e Agrimensura',
        endereco: 'Rua Principal, 123',
        telefone: '(11) 99999-9999',
        corPrimaria: '#ff0000',
        corSecundaria: '#00ff00',
      };
      salvarEscritorio(custom);
      expect(carregarEscritorio()).toEqual(custom);
    });
  });

  describe('Responsável Técnico Config', () => {
    it('retorna valores padrão se vazio', () => {
      expect(carregarTecnico()).toEqual(TECNICO_PADRAO);
    });

    it('salva e carrega o técnico com sucesso', () => {
      const custom = {
        ...TECNICO_PADRAO,
        nome: 'Engenheiro Agrimensor',
        cft: 'CFT-12345',
        credenciamentoIncra: 'XYZ',
      };
      salvarTecnico(custom);
      expect(carregarTecnico()).toEqual(custom);
    });
  });

  describe('Recibo Sequencial', () => {
    it('retorna 1 como próximo se não inicializado', () => {
      expect(proximoNumeroReciboSeq()).toBe(1);
    });

    it('permite definir e consultar próximo número', () => {
      definirNumeroReciboSeq(42);
      expect(proximoNumeroReciboSeq()).toBe(42);
    });

    it('corrige valores inválidos para o recibo', () => {
      definirNumeroReciboSeq(-10);
      expect(proximoNumeroReciboSeq()).toBe(1);
      
      definirNumeroReciboSeq(NaN);
      expect(proximoNumeroReciboSeq()).toBe(1);
    });

    it('consome o número sequencial formatado e avança o contador', () => {
      definirNumeroReciboSeq(5);
      const res = consumirNumeroRecibo(2026);
      expect(res).toBe('0005/2026');
      expect(proximoNumeroReciboSeq()).toBe(6);
    });
  });
});
