import type { Projeto } from '../topo/types';
import { migrarProjeto } from '../topo/glebas';
import { db, novoId } from './db';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, type CollectionReference } from 'firebase/firestore';
import { db as fdb, auth, firebaseConfigurado } from '../firebase/client';
import { workspaceUidAtual } from './perfilUso';
import { sanitizarProfundo } from '../export/sanitizar';

// Quando há Firebase configurado E usuário logado, os projetos vão para o Firestore
// (users/{uid}/projetos). Senão, ficam no IndexedDB local (offline / sem login).
function uidNuvem(): string | null {
  return workspaceUidAtual();
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
export class NuvemSemPermissao {
  name = 'NuvemSemPermissao';
  message = 'NUVEM_SEM_PERMISSAO';
  stack?: string;
  constructor() {
    this.stack = new Error('NUVEM_SEM_PERMISSAO').stack;
  }
}

// O Firestore recusa três coisas que um Projeto real contém: nomes de campo com ponto (os ajustes
// de posição da planta usam ids como "carimbo.titulo"), valores undefined e array dentro de array
// (o anel das parcelas certificadas). Por isso o documento na nuvem vira um ENVELOPE: os campos de
// listagem ficam soltos (id, nome, datas) e o projeto inteiro vai serializado em `dados`.
// Sem isso, o salvar na nuvem falhava justamente nos projetos com ajustes feitos — e o abrir,
// preferindo a nuvem, devolvia a versão antiga sem os ajustes.
interface EnvelopeNuvem { id: string; nome: string; criadoEm: number; atualizadoEm: number; dados: string }

function paraNuvem(p: Projeto): EnvelopeNuvem {
  return { id: p.id, nome: p.nome, criadoEm: p.criadoEm, atualizadoEm: p.atualizadoEm, dados: JSON.stringify(p) };
}
// Devolve o Projeto já MIGRADO (projetos antigos sem glebas ganham a gleba 1). Retorna null quando o
// documento está corrompido (não dá pra desserializar) — o chamador pula em vez de exibir lixo.
function daNuvem(raw: Record<string, unknown>): Projeto | null {
  if (typeof raw.dados === 'string') {
    try { return migrarProjeto(JSON.parse(raw.dados) as Projeto); }
    catch { return null; } // envelope com JSON quebrado: pula este registro
  }
  return migrarProjeto(raw as unknown as Projeto); // documento antigo, salvo antes do envelope
}

/** Onde o projeto foi de fato gravado: na nuvem (Firestore) ou só localmente (IndexedDB). */
export type DestinoSalvamento = 'nuvem' | 'local';

export async function salvarProjeto(p: Projeto): Promise<DestinoSalvamento> {
  const reg = sanitizarProfundo({ ...p, atualizadoEm: Date.now() });
  const uid = uidNuvem();
  if (uid) {
    try {
      await setDoc(doc(colProjetos(uid), p.id), paraNuvem(reg));
      return 'nuvem';
    } catch (e) {
      // Sem permissão (regras não publicadas) ou offline: guarda local como reserva e sinaliza,
      // para o usuário não perder o trabalho nem ver um erro cru.
      let reservaOk = false;
      try { const d = await db(); await d.put('projetos', { ...reg, _uidLocal: marcaLocal() }); reservaOk = true; } catch { /* reserva local falhou (ex.: sem espaço) */ }
      if (!reservaOk) {
        // Falhou na nuvem E não consegui a reserva local: o trabalho NÃO foi salvo. Avisa claro em
        // vez de fingir que guardou como reserva (senão o usuário fecha e perde de verdade).
        throw new Error('Não consegui salvar na nuvem nem guardar a reserva local (o navegador pode estar sem espaço). Libere espaço e tente de novo — seu trabalho continua aberto na tela.');
      }
      if (String((e as { code?: string }).code) === 'permission-denied' || /permission/i.test((e as Error).message)) {
        throw new NuvemSemPermissao();
      }
      return 'local';
    }
  }
  const d = await db();
  await d.put('projetos', { ...reg, _uidLocal: marcaLocal() });
  return 'local';
}

/**
 * Lista os projetos de OUTRO usuário, pelo uid — só o master consegue (as regras do Firestore dão
 * a ele leitura de users/{uid}/**; qualquer outra conta recebe "permission-denied"). Usada no painel
 * administrativo pra ver, sem editar, onde um cliente está travado (projeto vazio, sem confrontantes
 * pintados, etc.) — sem essa visão o suporte é só o que o cliente descreve por mensagem.
 */
export async function listarProjetosDoUsuario(uid: string): Promise<Projeto[]> {
  let targetUid = uid;
  try {
    const perfilSnap = await getDoc(doc(fdb()!, 'perfisUso', uid));
    if (perfilSnap.exists()) {
      const data = perfilSnap.data();
      if (data && data.workspaceUid) {
        targetUid = data.workspaceUid;
      }
    }
  } catch (e) {
    console.error('Falha ao obter workspaceUid do perfil:', e);
  }
  const snap = await getDocs(colProjetos(targetUid));
  return snap.docs.map((d) => daNuvem(d.data())).filter((p): p is Projeto => !!p && !p.excluidoEm).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

export async function listarProjetos(): Promise<Projeto[]> {
  const uid = uidNuvem();
  if (uid) {
    try {
      const snap = await getDocs(colProjetos(uid));
      return snap.docs.map((d) => daNuvem(d.data())).filter((p): p is Projeto => !!p && !p.excluidoEm).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
    } catch { /* nuvem indisponível/negada → cai para o local */ }
  }
  const d = await db();
  const todos = await d.getAll('projetos');
  return todos.filter(ehMeuLocal).filter((p) => !p.excluidoEm).sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

/** Projetos na LIXEIRA (excluídos, ainda restauráveis), mais recentes primeiro. */
export async function listarLixeira(): Promise<Projeto[]> {
  const uid = uidNuvem();
  if (uid) {
    try {
      const snap = await getDocs(colProjetos(uid));
      return snap.docs.map((d) => daNuvem(d.data())).filter((p): p is Projeto => !!p && !!p.excluidoEm).sort((a, b) => (b.excluidoEm ?? 0) - (a.excluidoEm ?? 0));
    } catch { /* cai pro local */ }
  }
  const d = await db();
  return (await d.getAll('projetos')).filter(ehMeuLocal).filter((p) => p.excluidoEm).sort((a, b) => (b.excluidoEm ?? 0) - (a.excluidoEm ?? 0));
}

/** Escreve o projeto no destino atual (nuvem ou local) SEM mexer em atualizadoEm — uso interno da lixeira. */
async function escreverProjeto(p: Projeto): Promise<void> {
  const clean = sanitizarProfundo(p);
  const uid = uidNuvem();
  if (uid) {
    try { await setDoc(doc(colProjetos(uid), p.id), paraNuvem(clean)); return; }
    catch { try { const d = await db(); await d.put('projetos', { ...clean, _uidLocal: marcaLocal() }); } catch { /* ignore */ } return; }
  }
  const d = await db();
  await d.put('projetos', { ...clean, _uidLocal: marcaLocal() });
}

/** Restaura um projeto da lixeira (volta a aparecer na lista). */
export async function restaurarProjeto(id: string): Promise<void> {
  const p = await carregarProjeto(id);
  if (!p) return;
  const { excluidoEm, ...resto } = p; void excluidoEm;
  await escreverProjeto(resto as Projeto);
}

/** Apaga DE VEZ (sem passar pela lixeira). */
export async function excluirDefinitivo(id: string): Promise<void> {
  const uid = uidNuvem();
  if (uid) { await deleteDoc(doc(colProjetos(uid), id)); return; }
  const d = await db();
  const reg = await d.get('projetos', id);
  if (reg && !ehMeuLocal(reg)) return;
  await d.delete('projetos', id);
}

/** Limpa da lixeira o que já passou do prazo (padrão 30 dias). */
export async function purgarLixeiraAntiga(dias = 90): Promise<void> {
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  const lixo = await listarLixeira();
  for (const p of lixo) {
    if ((p.excluidoEm ?? 0) < limite) { try { await excluirDefinitivo(p.id); } catch { /* segue */ } }
  }
}

export async function carregarProjeto(id: string): Promise<Projeto | undefined> {
  const uid = uidNuvem();
  if (uid) {
    const s = await getDoc(doc(colProjetos(uid), id));
    return s.exists() ? (daNuvem(s.data()) ?? undefined) : undefined;
  }
  const d = await db();
  const reg = await d.get('projetos', id);
  return reg && ehMeuLocal(reg) ? reg : undefined;
}

/** Exclusão SUAVE: manda para a lixeira (some da lista, mas dá pra restaurar por um prazo). */
export async function excluirProjeto(id: string): Promise<void> {
  const p = await carregarProjeto(id);
  if (!p) return;
  await escreverProjeto({ ...p, excluidoEm: Date.now() });
}

export async function sincronizarProjetosLocalParaNuvem(): Promise<void> {
  const uid = uidNuvem();
  if (!uid) return;
  try {
    const d = await db();
    const localProjects = (await d.getAll('projetos')).filter(ehMeuLocal);
    if (localProjects.length === 0) return;

    const snap = await getDocs(colProjetos(uid));
    const cloudProjectsMap = new Map(snap.docs.map((doc) => [doc.id, daNuvem(doc.data())]));

    for (const p of localProjects) {
      const cloudP = cloudProjectsMap.get(p.id);
      if (!cloudP || p.atualizadoEm > cloudP.atualizadoEm) {
        const { _uidLocal, ...limpo } = p; // marca é só de armazenamento local — não vai pra nuvem
        void _uidLocal;
        await setDoc(doc(colProjetos(uid), p.id), paraNuvem(sanitizarProfundo(limpo as Projeto)));
      }
      await d.delete('projetos', p.id);
    }
  } catch (e) {
    console.error('Falha ao sincronizar projetos local para nuvem:', e);
  }
}

export { novoId };

