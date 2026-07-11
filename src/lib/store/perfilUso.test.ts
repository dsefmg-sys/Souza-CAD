/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { removerMembroDoWorkspace } from './perfilUso';
import { setDoc, doc } from 'firebase/firestore';

vi.mock('../firebase/client', () => ({
  auth: () => ({
    currentUser: { uid: 'owner_123', email: 'owner@exemplo.com' },
  }),
  db: () => ({}),
  firebaseConfigurado: true,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn().mockReturnValue({ id: 'doc_ref_mock' }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

describe('perfilUso Store: Team Members Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removerMembroDoWorkspace desvincula um colaborador limpando o workspaceUid', async () => {
    await removerMembroDoWorkspace('helper_456');

    // Verifica se pegou o documento do membro helper_456 na coleção perfisUso
    expect(doc).toHaveBeenCalledWith(expect.any(Object), 'perfisUso', 'helper_456');
    
    // Verifica se atualizou o campo workspaceUid para null via setDoc/merge
    expect(setDoc).toHaveBeenCalledWith(
      { id: 'doc_ref_mock' },
      { workspaceUid: null },
      { merge: true }
    );
  });
});
