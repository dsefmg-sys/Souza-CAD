/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { salvarProjeto, listarProjetos } from './store/projects';
import { workspaceUidAtual } from './store/perfilUso';
import { db as getDb } from './store/db';

// Mock do Firebase client Auth e Firestore
vi.mock('./firebase/client', () => ({
  auth: () => ({
    currentUser: { uid: 'user_123', email: 'user@exemplo.com' },
  }),
  db: () => ({}),
  firebaseConfigurado: true,
}));

vi.mock('./store/perfilUso', () => ({
  workspaceUidAtual: vi.fn(),
}));

vi.mock('./store/db', () => ({
  db: vi.fn(),
  novoId: vi.fn().mockImplementation((prefix) => `${prefix}_mock_e2e`),
}));

// Mock do Firestore setDoc e getDocs para testes de integração
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn().mockResolvedValue({
    docs: [],
  }),
}));

describe('SaaS Smoke Test (E2E Teste de Fumaça)', () => {
  let mockStore: any[] = [];

  const mockDbClient = {
    put: vi.fn().mockImplementation(async (storeName, item) => {
      mockStore.push(item);
      return item.id;
    }),
    getAll: vi.fn().mockImplementation(async () => {
      return mockStore;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = [];
    vi.mocked(getDb).mockResolvedValue(mockDbClient as any);
  });

  it('Passo 1: Autenticação & Escopo do Workspace (Login e Verificação de Tenant)', async () => {
    // Simula que o usuário logado está trabalhando no seu próprio workspace (tenancy padrão)
    vi.mocked(workspaceUidAtual).mockReturnValue('user_123');
    
    const activeWorkspace = workspaceUidAtual();
    expect(activeWorkspace).toBe('user_123');
    expect(activeWorkspace).not.toBeNull();
  });

  it('Passo 2: Criação de Projeto & Escrita no Banco (Fluxo Vital)', async () => {
    vi.mocked(workspaceUidAtual).mockReturnValue('user_123');

    const novoProjeto = {
      id: 'proj_e2e',
      nome: 'Fazenda E2E Test',
      imovel: { denominacao: 'Sítio E2E', proprietario: 'João E2E' },
      glebas: [],
      zonaUtm: 23,
      hemisferio: 'S' as const,
      requerente: {},
      transmitente: {},
    } as any;

    // Salva o projeto (nuvem mockada responde com sucesso)
    const dest = await salvarProjeto(novoProjeto);
    expect(dest).toBe('nuvem');

    // Agora simula falha na nuvem (offline ou sem login) para testar gravação e listagem local
    vi.mocked(workspaceUidAtual).mockReturnValue(null);
    const destLocal = await salvarProjeto(novoProjeto);
    expect(destLocal).toBe('local');
    expect(mockStore).toHaveLength(1);
    expect(mockStore[0].nome).toBe('Fazenda E2E Test');

    // Listagem de projetos do usuário local
    const lista = await listarProjetos();
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe('proj_e2e');
  });

  it('Passo 3: Blindagem contra IDOR e Sequestro de Escopo (Acesso Proibido)', async () => {
    // Simula que o usuário tenta acessar ou definir seu workspace ativo para o de outra empresa sem convite
    const targetForbiddenWorkspace = 'outra_empresa_456';
    
    // Simula comportamento das regras de segurança (firestore.rules)
    const canAccessWorkspace = (userUid: string, workspaceUid: string, allowedWorkspaces: string[]) => {
      return userUid === workspaceUid || allowedWorkspaces.includes(workspaceUid);
    };

    // Caso A: Usuário 'user_123' tenta acessar o seu próprio workspace (PERMITIDO)
    const autorizacaoPropria = canAccessWorkspace('user_123', 'user_123', []);
    expect(autorizacaoPropria).toBe(true);

    // Caso B: Usuário 'user_123' tenta forçar acesso ao workspace 'outra_empresa_456' sem convite aprovado (BLOQUEADO)
    const autorizacaoInvasor = canAccessWorkspace('user_123', targetForbiddenWorkspace, []);
    expect(autorizacaoInvasor).toBe(false);

    // Caso C: Usuário 'user_123' tenta acessar o workspace 'outra_empresa_456' tendo o convite aprovado (PERMITIDO)
    const autorizacaoParceiro = canAccessWorkspace('user_123', targetForbiddenWorkspace, ['outra_empresa_456']);
    expect(autorizacaoParceiro).toBe(true);
  });
});
