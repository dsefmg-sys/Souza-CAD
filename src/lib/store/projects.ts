import type { Projeto } from '../topo/types';
import { db, novoId } from './db';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, type CollectionReference } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';

// Quando há Firebase configurado E usuário logado, os projetos vão para o Firestore
// (users/{uid}/projetos). Senão, ficam no IndexedDB local (offline / sem login).
function uidNuvem(): string | null {
  if (!firebaseConfigurado) return null;
  return auth()?.currentUser?.uid ?? null;
}
function colProjetos(uid: string): CollectionReference {
  return collection(fdb()!, 'users', uid, 'projetos');
}

/** Erro sinalizando que a nuvem negou e o projeto foi guardado localmente como reserva. */
export class NuvemSemPermissao extends Error {
  constructor() { super('NUVEM_SEM_PERMISSAO'); this.name = 'NuvemSemPermissao'; }
}

export async function salvarProjeto(p: Projeto): Promise<void> {
  const reg = { ...p, atualizadoEm: Date.now() };
  const uid = uidNuvem();
  if (uid) {
    try {
      await setDoc(doc(colProjetos(uid), p.id), reg);
      return;
    } catch (e) {
      // Sem permissão (regras não publicadas) ou offline: guarda local como reserva e sinaliza,
      // para o usuário não perder o trabalho nem ver um erro cru.
      try { const d = await db(); await d.put('projetos', reg); } catch { /* ignore */ }
      if (String((e as { code?: string }).code) === 'permission-denied' || /permission/i.test((e as Error).message)) {
        throw new NuvemSemPermissao();
      }
      throw e;
    }
  }
  const d = await db();
  await d.put('projetos', reg);
}

export async function listarProjetos(): Promise<Projeto[]> {
  const uid = uidNuvem();
  if (uid) {
    try {
      const snap = await getDocs(colProjetos(uid));
      return snap.docs.map((d) => d.data() as Projeto).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
    } catch { /* nuvem indisponível/negada → cai para o local */ }
  }
  const d = await db();
  return (await d.getAll('projetos')).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

export async function carregarProjeto(id: string): Promise<Projeto | undefined> {
  const uid = uidNuvem();
  if (uid) {
    const s = await getDoc(doc(colProjetos(uid), id));
    return s.exists() ? (s.data() as Projeto) : undefined;
  }
  const d = await db();
  return d.get('projetos', id);
}

export async function excluirProjeto(id: string): Promise<void> {
  const uid = uidNuvem();
  if (uid) { await deleteDoc(doc(colProjetos(uid), id)); return; }
  const d = await db();
  await d.delete('projetos', id);
}

export { novoId };
