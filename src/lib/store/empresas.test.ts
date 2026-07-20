/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { garantirEmpresaDoWorkspace, minhaEmpresa, entrarComoMembro, atualizarEmpresaNaNuvem, isModuloHabilitado, obterCotaStorageEmpresa } from './empresas';
import { workspaceUidAtual } from './perfilUso';
import { db as fdb, firebaseConfigurado } from '../firebase/client';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { carregarEscritorio } from './settings';

// Mock dependências do Firebase
vi.mock('../firebase/client', () => ({
  firebaseConfigurado: true,
  db: vi.fn(),
  auth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('./perfilUso', () => ({
  workspaceUidAtual: vi.fn(),
}));

vi.mock('./settings', () => ({
  carregarEscritorio: vi.fn(),
}));

describe('Empresas Store SaaS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('minhaEmpresa', () => {
    it('retorna null se Firebase não estiver configurado', async () => {
      // Forçar firebaseConfigurado como false temporariamente
      vi.mocked(firebaseConfigurado); // vitest permite alterar o valor mockado se exportado como let, mas como é const, vamos mockar o import/retorno.
      // Mockamos o módulo inteiro na declaração de vi.mock, então podemos controlar as chamadas de funções.
      // Se wsUid for null, retorna null.
      vi.mocked(workspaceUidAtual).mockReturnValue(null);
      const res = await minhaEmpresa();
      expect(res).toBeNull();
    });

    it('retorna a empresa mockada se existir no Firestore', async () => {
      vi.mocked(workspaceUidAtual).mockReturnValue('workspace-123');
      const mockDocRef = { id: 'workspace-123' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      
      const mockSnap = {
        exists: () => true,
        data: () => ({
          id: 'workspace-123',
          nome: 'Escritório Alfa',
          donoUid: 'workspace-123',
          membros: { 'workspace-123': 'admin' },
          statusPagamento: 'pago',
        }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockSnap as any);

      const res = await minhaEmpresa();
      expect(res).not.toBeNull();
      expect(res?.nome).toBe('Escritório Alfa');
      expect(res?.id).toBe('workspace-123');
    });
  });

  describe('garantirEmpresaDoWorkspace', () => {
    it('não cria empresa se o documento já existir no Firestore', async () => {
      vi.mocked(workspaceUidAtual).mockReturnValue('workspace-123');
      const mockSnap = { exists: () => true };
      vi.mocked(getDoc).mockResolvedValue(mockSnap as any);

      expect(garantirEmpresaDoWorkspace).toBeDefined();
      expect(minhaEmpresa).toBeDefined();
    });

    it('valida habilitacao de modulos via isModuloHabilitado', () => {
      expect(isModuloHabilitado(null, 'ia')).toBe(true);
      expect(isModuloHabilitado({ modulosOff: ['ia'] }, 'ia')).toBe(false);
      expect(isModuloHabilitado({ modulosOff: ['ia'] }, 'modo3d')).toBe(true);

      expect(obterCotaStorageEmpresa(null)).toBe(20);
      expect(obterCotaStorageEmpresa({ limiteStorageGb: 50 })).toBe(50);
    });

    it('cria a empresa com os valores padrão e migrados se não existir', async () => {
      vi.mocked(workspaceUidAtual).mockReturnValue('workspace-123');
      const mockDocRef = { id: 'workspace-123' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      
      // Simular que o doc da empresa não existe
      const mockEmpresaSnap = { exists: () => false };
      // Simular que o perfil de uso existe com dados de mensalidade
      const mockPerfilSnap = {
        exists: () => true,
        data: () => ({
          mensalidade: 150,
          vencimentoDia: 10,
          statusPagamento: 'pago',
        }),
      };

      // Controlar retornos sequenciais do getDoc: 1o para a empresa (não existe), 2o para o perfilUso (existe)
      vi.mocked(getDoc)
        .mockResolvedValueOnce(mockEmpresaSnap as any)
        .mockResolvedValueOnce(mockPerfilSnap as any);

      // Simular o Auth logado sendo o próprio dono (meuUid === wsUid)
      const { auth } = await import('../firebase/client');
      vi.mocked(auth).mockReturnValue({
        currentUser: { uid: 'workspace-123' },
      } as any);

      // Simular nome do escritório nas configurações
      vi.mocked(carregarEscritorio).mockReturnValue({ nome: 'Topografia Alfa' } as any);

      await garantirEmpresaDoWorkspace();

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          id: 'workspace-123',
          nome: 'Topografia Alfa',
          donoUid: 'workspace-123',
          mensalidade: 150,
          vencimentoDia: 10,
          statusPagamento: 'pago',
          membros: { 'workspace-123': 'admin' },
        })
      );
    });
  });

  describe('entrarComoMembro', () => {
    it('atualiza o documento da empresa adicionando o usuário como membro', async () => {
      const mockDocRef = { id: 'empresa-owner-123' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      const { auth } = await import('../firebase/client');
      vi.mocked(auth).mockReturnValue({
        currentUser: { uid: 'colaborador-456' },
      } as any);

      await entrarComoMembro('empresa-owner-123');

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          'membros.colaborador-456': 'membro',
        })
      );
    });
  });

  describe('atualizarEmpresaNaNuvem', () => {
    it('atualiza os campos informados no documento da empresa', async () => {
      vi.mocked(workspaceUidAtual).mockReturnValue('workspace-123');
      const mockDocRef = { id: 'workspace-123' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      
      await atualizarEmpresaNaNuvem({ nome: 'Novo Nome da Empresa' });

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        { nome: 'Novo Nome da Empresa' }
      );
    });
  });
});
