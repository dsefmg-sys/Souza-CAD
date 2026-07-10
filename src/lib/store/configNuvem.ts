import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';
import { carregarTecnico, carregarEscritorio, salvarTecnico, salvarEscritorio, TECNICO_PADRAO, ESCRITORIO_PADRAO } from './settings';
import type { TecnicoData, EscritorioData } from '../topo/types';
import { workspaceUidAtual } from './perfilUso';

// Cadastro do RESPONSÁVEL TÉCNICO e do ESCRITÓRIO por CONTA (multi-empresa). Antes ficava só no
// navegador (localStorage) — o que vazava dados entre usuários no mesmo computador e não seguia a
// pessoa entre aparelhos. Agora a nuvem (users/{uid}) é a fonte da verdade por conta; o localStorage
// vira só um cache rápido, sincronizado no login, no salvar e limpo na saída.

const KEY_SETUP = 'metrica.setupFeito';
const KEY_DONO = 'metrica.configUid'; // de qual usuário é o cadastro que está no cache local

function uidAtual(): string | null {
  return workspaceUidAtual();
}

function donoLocal(): string | null {
  try { return localStorage.getItem(KEY_DONO); } catch { return null; }
}
function marcarDono(uid: string): void {
  try { localStorage.setItem(KEY_DONO, uid); } catch { /* ignore */ }
}

/**
 * Puxa o cadastro da CONTA logada para o cache local. Se a conta ainda não tem cadastro, RESETA o
 * cache local para os padrões neutros (em branco) — assim um segundo usuário no mesmo navegador
 * nunca herda o cadastro do primeiro. Devolve true quando a conta já está configurada.
 *
 * `forcar`: usa quando se SABE que o workspace acabou de mudar agora mesmo (ex.: convite/vínculo
 * recém-aceito) — pula a checagem de `donoLocal()` (que só serve pra separar DOIS USUÁRIOS
 * diferentes no mesmo navegador) e sempre sobrescreve o cache pela nuvem, mesmo quando a chave local
 * `metrica.configUid` já tiver ficado marcada com este uid numa tentativa anterior. Sem isso, um
 * colaborador que já tinha cadastrado os PRÓPRIOS dados antes de aceitar um convite continuava
 * vendo os próprios dados em vez dos dados de quem o convidou (bug relatado 10/07/2026).
 */
export async function puxarConfigDaNuvem(forcar = false): Promise<boolean> {
  const uid = uidAtual();
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(fdb()!, 'users', uid));
    const d = snap.exists() ? (snap.data() as { tecnico?: TecnicoData; escritorio?: EscritorioData; configurado?: boolean }) : null;
    if (d?.tecnico || d?.escritorio) {
      // a conta tem cadastro na nuvem: a nuvem é a verdade, sobrescreve o cache
      salvarTecnico(d.tecnico ?? TECNICO_PADRAO);
      salvarEscritorio(d.escritorio ?? ESCRITORIO_PADRAO);
      marcarDono(uid);
    } else if (forcar || donoLocal() !== uid) {
      // conta nova E (o cache local é de OUTRO usuário, OU sabemos com certeza que o workspace
      // mudou agora): zera pra não herdar cadastro alheio. Sem `forcar`, se o cache já for deste
      // usuário (dados recém-preenchidos ainda não subidos), MANTÉM.
      salvarTecnico(TECNICO_PADRAO);
      salvarEscritorio(ESCRITORIO_PADRAO);
      marcarDono(uid);
    }
    return !!d?.configurado;
  } catch {
    return false;
  }
}

/** Grava o cadastro atual (técnico + escritório) na CONTA na nuvem e marca como configurada. */
export async function empurrarConfigParaNuvem(): Promise<void> {
  const uid = uidAtual();
  if (!uid) return;
  marcarDono(uid); // o cache local passa a ser (e a pertencer a) este usuário
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
  try {
    localStorage.removeItem(KEY_SETUP);
    localStorage.removeItem(KEY_DONO);
    localStorage.removeItem('metrica.preferencias');
  } catch { /* ignore */ }
}
