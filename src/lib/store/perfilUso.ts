import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';
import { TERMOS_VERSAO } from '../legal/termos';

// Perfil de USO por conta, guardado em `perfisUso/{uid}` no Firestore. Serve pra:
//  - registrar o aceite dos termos (data + versão);
//  - o titular (master) acompanhar quem usa o sistema: empresa, RT, último projeto, volume.
// Cada usuário escreve só o próprio; o master lê todos (ver firestore.rules). Cache local pra
// funcionar sem nuvem/offline.

export interface PerfilUso {
  uid: string;
  email: string;
  empresaNome?: string;
  empresaCnpj?: string;
  rtNome?: string;
  rtCft?: string;
  termosAceitosEm?: number;
  termosVersao?: string;
  criadoEm: number;
  ultimoAcessoEm?: number;
  ultimoProjetoEm?: number;
  ultimoProjetoNome?: string;
  totalProjetos?: number;
}

const CACHE = 'metrica.perfilUso';
const KEY_TERMOS = 'metrica.termosAceitos'; // guarda a versão aceita localmente

function uid(): string | null {
  return firebaseConfigurado ? (auth()?.currentUser?.uid ?? null) : null;
}
function email(): string {
  return (firebaseConfigurado ? auth()?.currentUser?.email : '') ?? '';
}

/** True quando o usuário já aceitou a versão ATUAL dos termos (checagem local, rápida). */
export function termosAceitosLocal(): boolean {
  try { return localStorage.getItem(KEY_TERMOS) === TERMOS_VERSAO; } catch { return false; }
}

/** Registra o aceite dos termos (local + perfil na nuvem). */
export async function aceitarTermos(): Promise<void> {
  try { localStorage.setItem(KEY_TERMOS, TERMOS_VERSAO); } catch { /* ignore */ }
  await sincronizarPerfil({ termosAceitosEm: Date.now(), termosVersao: TERMOS_VERSAO });
}

function lerCache(): Partial<PerfilUso> {
  try { return JSON.parse(localStorage.getItem(CACHE) || '{}'); } catch { return {}; }
}

/** Cria/atualiza (merge) o perfil de uso da conta atual. */
export async function sincronizarPerfil(patch: Partial<PerfilUso>): Promise<void> {
  const u = uid();
  const base = lerCache();
  const merged: Partial<PerfilUso> = {
    ...base,
    ...patch,
    uid: u ?? base.uid ?? 'local',
    email: email() || base.email || '',
    criadoEm: base.criadoEm ?? Date.now(),
  };
  try { localStorage.setItem(CACHE, JSON.stringify(merged)); } catch { /* ignore */ }
  if (u && firebaseConfigurado) {
    try { await setDoc(doc(fdb()!, 'perfisUso', u), merged, { merge: true }); } catch { /* offline/regras — fica no cache */ }
  }
}

/** Chamada ao salvar um projeto: atualiza último projeto e volume. */
export async function registrarProjetoSalvo(nome: string): Promise<void> {
  const base = lerCache();
  await sincronizarPerfil({
    ultimoProjetoEm: Date.now(),
    ultimoProjetoNome: nome || 'Sem nome',
    totalProjetos: (base.totalProjetos ?? 0) + 1,
  });
}

/** Lista todos os perfis de uso — só o master consegue ler (regras do Firestore). */
export async function listarPerfisUso(): Promise<PerfilUso[]> {
  if (!firebaseConfigurado) return [];
  try {
    const snap = await getDocs(collection(fdb()!, 'perfisUso'));
    return snap.docs.map((d) => d.data() as PerfilUso).sort((a, b) => (b.ultimoAcessoEm ?? 0) - (a.ultimoAcessoEm ?? 0));
  } catch (e) {
    console.warn('Falha ao listar perfis de uso (só o master tem acesso):', e);
    return [];
  }
}

/** Consulta se a conta atual já aceitou os termos na nuvem (fallback quando não há cache local). */
export async function termosAceitosNuvem(): Promise<boolean> {
  const u = uid();
  if (!u || !firebaseConfigurado) return false;
  try {
    const s = await getDoc(doc(fdb()!, 'perfisUso', u));
    return s.exists() && (s.data() as PerfilUso).termosVersao === TERMOS_VERSAO;
  } catch { return false; }
}
