import type { ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad } from '../topo/types';
import { db, novoId } from './db';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';

type Store = 'proprietarios' | 'confrontantes' | 'imoveis' | 'cartorios';

// Logado + Firebase configurado → cadastros no Firestore (users/{uid}/{store}); senão local.
function uidNuvem(): string | null {
  if (!firebaseConfigurado) return null;
  return auth()?.currentUser?.uid ?? null;
}

async function listar<T>(store: Store): Promise<T[]> {
  const uid = uidNuvem();
  if (uid) {
    try { return (await getDocs(collection(fdb()!, 'users', uid, store))).docs.map((d) => d.data() as T); }
    catch { /* nuvem negada/indisponível → local */ }
  }
  const d = await db();
  return (await d.getAll(store)) as T[];
}
async function gravar<T extends { id: string }>(store: Store, item: T): Promise<T> {
  const comId = (item.id ? item : { ...item, id: novoId('c') }) as T;
  const uid = uidNuvem();
  if (uid) {
    try { await setDoc(doc(collection(fdb()!, 'users', uid, store), comId.id), comId as Record<string, unknown>); return comId; }
    catch { /* nuvem negada/indisponível → guarda local como reserva */ }
  }
  const d = await db();
  await d.put(store, comId as never);
  return comId;
}
async function remover(store: Store, id: string): Promise<void> {
  const uid = uidNuvem();
  if (uid) { await deleteDoc(doc(collection(fdb()!, 'users', uid, store), id)); return; }
  const d = await db();
  await d.delete(store, id);
}

export const proprietarios = {
  listar: () => listar<ProprietarioCad>('proprietarios'),
  salvar: (p: ProprietarioCad) => gravar('proprietarios', p),
  excluir: (id: string) => remover('proprietarios', id),
};
export const confrontantesCad = {
  listar: () => listar<ConfrontanteCad>('confrontantes'),
  salvar: (c: ConfrontanteCad) => gravar('confrontantes', c),
  excluir: (id: string) => remover('confrontantes', id),
};
export const imoveisCad = {
  listar: () => listar<ImovelCad>('imoveis'),
  salvar: (i: ImovelCad) => gravar('imoveis', i),
  excluir: (id: string) => remover('imoveis', id),
};
export const cartoriosCad = {
  listar: () => listar<CartorioCad>('cartorios'),
  salvar: (c: CartorioCad) => gravar('cartorios', c),
  excluir: (id: string) => remover('cartorios', id),
};

export async function sincronizarCadastrosLocalParaNuvem(): Promise<void> {
  const uid = uidNuvem();
  if (!uid) return;
  try {
    const d = await db();
    const stores: Store[] = ['proprietarios', 'confrontantes', 'imoveis', 'cartorios'];
    for (const store of stores) {
      const localItems = (await d.getAll(store)) as { id: string }[];
      if (localItems.length === 0) continue;
      
      const colRef = collection(fdb()!, 'users', uid, store);
      for (const item of localItems) {
        const ref = doc(colRef, item.id);
        // se o cadastro JÁ existe na nuvem, a versão da nuvem manda — não sobrescreve (poderia apagar
        // uma edição mais nova feita em outro aparelho). Só empurra os cadastros que só existiam local.
        const existente = await getDoc(ref);
        if (!existente.exists()) await setDoc(ref, item as Record<string, unknown>);
        await d.delete(store, item.id);
      }
    }
  } catch (e) {
    console.error('Falha ao sincronizar cadastros local para nuvem:', e);
  }
}

export { novoId };

