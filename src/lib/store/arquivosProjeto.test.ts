/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { salvarArquivo, listarArquivos, listarArquivosPorDono, excluirArquivo } from './arquivosProjeto';
import { db as getDb } from './db';

// Mock do módulo db
vi.mock('./db', () => ({
  db: vi.fn(),
  novoId: vi.fn().mockImplementation((prefix) => `${prefix}_mock_123`),
}));

describe('Arquivos de Projeto Store', () => {
  let mockStore: Record<string, any>[] = [];

  const mockDbClient = {
    getAllFromIndex: vi.fn().mockImplementation(async (storeName, indexName, key) => {
      return mockStore.filter((item) => item.projetoId === key);
    }),
    put: vi.fn().mockImplementation(async (storeName, item) => {
      mockStore.push(item);
      return item.id;
    }),
    delete: vi.fn().mockImplementation(async (storeName, key) => {
      mockStore = mockStore.filter((item) => item.id !== key);
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = [];
    vi.mocked(getDb).mockResolvedValue(mockDbClient as any);
  });

  describe('salvarArquivo (Validações e Escrita)', () => {
    it('salva com sucesso uma imagem válida', async () => {
      const mockFile = new File(['conteudo-imagem'], 'foto-campo.png', { type: 'image/png' });
      const meta = { dono: 'imovel' as const, tipoDoc: 'Foto' };

      const res = await salvarArquivo('proj_1', mockFile, meta);

      expect(res.id).toBe('arq_mock_123');
      expect(res.projetoId).toBe('proj_1');
      expect(res.nome).toBe('foto-campo.png');
      expect(res.tipo).toBe('image/png');
      expect(res.dono).toBe('imovel');
      expect(res.tipoDoc).toBe('Foto');
      expect(mockStore).toHaveLength(1);
    });

    it('salva com sucesso um PDF válido', async () => {
      const mockFile = new File(['conteudo-pdf'], 'matricula.pdf', { type: 'application/pdf' });
      const res = await salvarArquivo('proj_1', mockFile);

      expect(res.nome).toBe('matricula.pdf');
      expect(res.tipo).toBe('application/pdf');
    });

    it('REJEITA arquivos executáveis com extensão perigosa (ex. exe)', async () => {
      const mockFile = new File(['virus-content'], 'malware.exe', { type: 'application/octet-stream' });
      await expect(salvarArquivo('proj_1', mockFile)).rejects.toThrow(
        'Tipo de arquivo não permitido!'
      );
      expect(mockStore).toHaveLength(0);
    });

    it('REJEITA arquivos de texto simulando PDF com MIME-type alterado', async () => {
      const mockFile = new File(['some-text'], 'planilha.exe', { type: 'application/pdf' });
      await expect(salvarArquivo('proj_1', mockFile)).rejects.toThrow(
        'Tipo de arquivo não permitido!'
      );
    });

    it('REJEITA arquivos de imagem com extensão de script (.js)', async () => {
      const mockFile = new File(['console.log(1)'], 'script.js', { type: 'image/png' });
      await expect(salvarArquivo('proj_1', mockFile)).rejects.toThrow(
        'Tipo de arquivo não permitido!'
      );
    });
  });

  describe('listarArquivos', () => {
    it('retorna arquivos do projeto ordenados por data de criação', async () => {
      mockStore = [
        { id: '1', projetoId: 'proj_1', nome: 'a.png', tipo: 'image/png', criadoEm: 100 },
        { id: '2', projetoId: 'proj_1', nome: 'b.png', tipo: 'image/png', criadoEm: 200 },
        { id: '3', projetoId: 'proj_2', nome: 'c.png', tipo: 'image/png', criadoEm: 150 },
      ];

      const res = await listarArquivos('proj_1');
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe('2'); // Mais recente primeiro
      expect(res[1].id).toBe('1');
    });
  });

  describe('listarArquivosPorDono', () => {
    it('filtra corretamente arquivos por dono e confrontante', async () => {
      mockStore = [
        { id: '1', projetoId: 'proj_1', nome: 'a.png', tipo: 'image/png', dono: 'imovel', criadoEm: 100 },
        { id: '2', projetoId: 'proj_1', nome: 'b.png', tipo: 'image/png', dono: 'confrontante', confrontanteId: 'conf_1', criadoEm: 110 },
        { id: '3', projetoId: 'proj_1', nome: 'c.png', tipo: 'image/png', dono: 'confrontante', confrontanteId: 'conf_2', criadoEm: 120 },
      ];

      const imovelDocs = await listarArquivosPorDono('proj_1', 'imovel');
      expect(imovelDocs).toHaveLength(1);
      expect(imovelDocs[0].id).toBe('1');

      const conf1Docs = await listarArquivosPorDono('proj_1', 'confrontante', 'conf_1');
      expect(conf1Docs).toHaveLength(1);
      expect(conf1Docs[0].id).toBe('2');
    });
  });

  describe('excluirArquivo', () => {
    it('deleta o arquivo por ID do banco de dados', async () => {
      mockStore = [
        { id: '1', projetoId: 'proj_1', nome: 'a.png', tipo: 'image/png' },
      ];

      await excluirArquivo('1');
      expect(mockStore).toHaveLength(0);
    });
  });
});
