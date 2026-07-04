import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';
import { carregarTecnico, carregarEscritorio, salvarTecnico, salvarEscritorio, TECNICO_PADRAO, ESCRITORIO_PADRAO } from './settings';
import type { TecnicoData, EscritorioData } from '../topo/types';

// Cadastro do RESPONSÁVEL TÉCNICO e do ESCRITÓRIO por CONTA (multi-empresa). Antes ficava só no
// navegador (localStorage) — o que vazava dados entre usuários no mesmo computador e não seguia a
// pessoa entre aparelhos. Agora a nuvem (users/{uid}) é a fonte da verdade por conta; o localStorage
// vira só um cache rápido, sincronizado no login, no salvar e limpo na saída.

const KEY_SETUP = 'metrica.setupFeito';

function uidAtual(): string | null {
  if (!firebaseConfigurado) return null;
  return auth()?.currentUser?.uid ?? null;
}

/**
 * Puxa o cadastro da CONTA logada para o cache local. Se a conta ainda não tem cadastro, RESETA o
 * cache local para os padrões neutros (em branco) — assim um segundo usuário no mesmo navegador
 * nunca herda o cadastro do primeiro. Devolve true quando a conta já está configurada.
 */
export async function puxarConfigDaNuvem(): Promise<boolean> {
  const uid = uidAtual();
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(fdb()!, 'users', uid));
    const d = snap.exists() ? (snap.data() as { tecnico?: TecnicoData; escritorio?: EscritorioData; configurado?: boolean }) : null;
    // sobrescreve o cache local com o da conta (ou com o padrão em branco quando a conta é nova)
    salvarTecnico(d?.tecnico ?? TECNICO_PADRAO);
    salvarEscritorio(d?.escritorio ?? ESCRITORIO_PADRAO);
    return !!d?.configurado;
  } catch {
    return false;
  }
}

/** Grava o cadastro atual (técnico + escritório) na CONTA na nuvem e marca como configurada. */
export async function empurrarConfigParaNuvem(): Promise<void> {
  const uid = uidAtual();
  if (!uid) return;
  try {
    await setDoc(
      doc(fdb()!, 'users', uid),
      { tecnico: carregarTecnico(), escritorio: carregarEscritorio(), configurado: true },
      { merge: true },
    );
  } catch {
    /* offline/sem permissão — o cache local segue valendo até reconectar */
  }
}

/** Limpa o cadastro do NAVEGADOR (usar ao SAIR): o próximo usuário não vê nada do anterior. */
export function limparConfigLocalNaSaida(): void {
  salvarTecnico(TECNICO_PADRAO);
  salvarEscritorio(ESCRITORIO_PADRAO);
  try { localStorage.removeItem(KEY_SETUP); } catch { /* ignore */ }
}
