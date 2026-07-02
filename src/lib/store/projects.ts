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

// Marca de "dono" de um projeto guardado LOCALMENTE (IndexedDB): evita que, no mesmo navegador,
// o trabalho de um usuário logado apareça pra outro — por exemplo, dois agrimensores usando o
// mesmo computador, cada um na sua própria conta, num momento em que a nuvem falhou pra um deles
// (fica guardado local como reserva). Sem login (ou sem Firebase configurado), cai no balde
// 'local' — não existe "outro usuário" a proteger nesse caso. Registros salvos ANTES desta
// correção não tinham essa marca; tratamos como 'local' para não sumir com projeto antigo.
function marcaLocal(): string {
  return (firebaseConfigurado ? auth()?.currentUser?.uid : null) ?? 'local';
}
function ehMeuLocal(p: { _uidLocal?: string }): boolean {
  return (p._uidLocal ?? 'local') === marcaLocal();
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
      try { const d = await db(); await d.put('projetos', { ...reg, _uidLocal: marcaLocal() }); } catch { /* ignore */ }
      if (String((e as { code?: string }).code) === 'permission-denied' || /permission/i.test((e as Error).message)) {
        throw new NuvemSemPermissao();
      }
      throw e;
    }
  }
  const d = await db();
  await d.put('projetos', { ...reg, _uidLocal: marcaLocal() });
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
  const todos = await d.getAll('projetos');
  return todos.filter(ehMeuLocal).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

export async function carregarProjeto(id: string): Promise<Projeto | undefined> {
  const uid = uidNuvem();
  if (uid) {
    const s = await getDoc(doc(colProjetos(uid), id));
    return s.exists() ? (s.data() as Projeto) : undefined;
  }
  const d = await db();
  const reg = await d.get('projetos', id);
  return reg && ehMeuLocal(reg) ? reg : undefined;
}

export async function excluirProjeto(id: string): Promise<void> {
  const uid = uidNuvem();
  if (uid) { await deleteDoc(doc(colProjetos(uid), id)); return; }
  const d = await db();
  const reg = await d.get('projetos', id);
  if (reg && !ehMeuLocal(reg)) return; // não é seu (dono diferente no mesmo navegador) — não apaga
  await d.delete('projetos', id);
}

export async function sincronizarProjetosLocalParaNuvem(): Promise<void> {
  const uid = uidNuvem();
  if (!uid) return;
  try {
    const d = await db();
    const localProjects = (await d.getAll('projetos')).filter(ehMeuLocal);
    if (localProjects.length === 0) return;

    const snap = await getDocs(colProjetos(uid));
    const cloudProjectsMap = new Map(snap.docs.map((doc) => [doc.id, doc.data() as Projeto]));

    for (const p of localProjects) {
      const cloudP = cloudProjectsMap.get(p.id);
      if (!cloudP || p.atualizadoEm > cloudP.atualizadoEm) {
        const { _uidLocal, ...limpo } = p; // marca é só de armazenamento local — não vai pra nuvem
        void _uidLocal;
        await setDoc(doc(colProjetos(uid), p.id), limpo);
      }
      await d.delete('projetos', p.id);
    }
  } catch (e) {
    console.error('Falha ao sincronizar projetos local para nuvem:', e);
  }
}

export { novoId };

