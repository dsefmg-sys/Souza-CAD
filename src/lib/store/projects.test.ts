/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { listarProjetosDoUsuario, purgarLixeiraAntiga } from './projects';
import { getDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';

vi.mock('../firebase/client', () => ({
  auth: () => ({
    currentUser: { uid: 'master_uid', email: 'dsefmg@gmail.com' },
  }),
  db: () => ({}),
  firebaseConfigurado: true,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({ id: 'doc_ref_mock' }),
  getDoc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({
    docs: [
      { id: 'p1', data: () => ({ id: 'p1', nome: 'Projeto 1', dados: JSON.stringify({ id: 'p1', nome: 'Projeto 1', imovel: {}, glebas: [] }) }) }
    ]
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock('./perfilUso', () => ({
  workspaceUidAtual: vi.fn().mockReturnValue('user_123'),
}));

describe('projects Store: Workspace Project Listing & Lixeira', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listarProjetosDoUsuario resolve workspaceUid do perfil', async () => {
    // Caso: O usuário pesquisado é um helper ('helper_uid') que está vinculado ao workspace 'company_uid'
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'helper_uid', workspaceUid: 'company_uid' }),
    } as any);

    const projs = await listarProjetosDoUsuario('helper_uid');
    
    // Deve buscar o perfil do usuário helper_uid para descobrir o workspaceUid dele
    expect(doc).toHaveBeenCalledWith(expect.any(Object), 'perfisUso', 'helper_uid');
    
    // E depois listar projetos usando o 'company_uid' (da empresa), não 'helper_uid'
    expect(projs).toHaveLength(1);
    expect(projs[0].id).toBe('p1');
  });

  it('purgarLixeiraAntiga respeita o limite de 90 dias por padrao', async () => {
    const agora = Date.now();
    const lixoValido = { 
      id: 'p_recente', 
      nome: 'Recente', 
      excluidoEm: agora - 10 * 24 * 60 * 60 * 1000, 
      dados: JSON.stringify({ id: 'p_recente', nome: 'Recente', excluidoEm: agora - 10 * 24 * 60 * 60 * 1000, imovel: {}, glebas: [] })
    }; 
    const lixoAntigo = { 
      id: 'p_antigo', 
      nome: 'Antigo', 
      excluidoEm: agora - 95 * 24 * 60 * 60 * 1000, 
      dados: JSON.stringify({ id: 'p_antigo', nome: 'Antigo', excluidoEm: agora - 95 * 24 * 60 * 60 * 1000, imovel: {}, glebas: [] })
    };

    vi.mocked(getDocs).mockResolvedValue({
      docs: [
        { id: 'p_recente', data: () => lixoValido },
        { id: 'p_antigo', data: () => lixoAntigo },
      ]
    } as any);

    await purgarLixeiraAntiga();

    // Deve deletar o projeto antigo (> 90 dias) e poupar o recente
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
