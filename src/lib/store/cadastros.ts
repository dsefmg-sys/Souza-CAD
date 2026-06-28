import type { ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad } from '../topo/types';
import { db, novoId } from './db';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';

type Store = 'proprietarios' | 'confrontantes' | 'imoveis' | 'cartorios';

// Logado + Firebase configurado → cadastros no Firestore (users/{uid}/{store}); senão local.
function uidNuvem(): string | null {
  if (!firebaseConfigurado) return null;
  return auth()?.currentUser?.uid ?? null;
}

async function listar<T>(store: Store): Promise<T[]> {
  const uid = uidNuvem();
  if (uid) return (await getDocs(collection(fdb()!, 'users', uid, store))).docs.map((d) => d.data() as T);
  const d = await db();
  return (await d.getAll(store)) as T[];
}
async function gravar<T extends { id: string }>(store: Store, item: T): Promise<T> {
  const comId = (item.id ? item : { ...item, id: novoId('c') }) as T;
  const uid = uidNuvem();
  if (uid) { await setDoc(doc(collection(fdb()!, 'users', uid, store), comId.id), comId as Record<string, unknown>); return comId; }
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

export { novoId };
