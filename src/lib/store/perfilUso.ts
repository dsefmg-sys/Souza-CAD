import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, getCountFromServer } from 'firebase/firestore';
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
  mensalidade?: number;
  statusPagamento?: 'pago' | 'atrasado' | 'isento';
  vencimentoDia?: number;
  atrasadoDesde?: number | null;
  observacoesAdmin?: string;
  workspaceUid?: string;
  lat?: number;
  lon?: number;
  municipio?: string;
  uf?: string;
  excluidoEm?: number | null;
  // Licenças de Módulos (SaaS)
  licencaAmbiental?: boolean;
  licencaUsucapiao?: boolean;
  licencaAvaliacao?: boolean;
  licencaJuridico?: boolean;
  licencaReurb?: boolean;
  licencaLoteamento?: boolean;
  licencaCredito?: boolean;
  licencaEstudio3d?: boolean;
  licencaExtrairIa?: boolean;
}

const CACHE = 'metrica.perfilUso';
const KEY_TERMOS = 'metrica.termosAceitos'; // guarda a versão aceita localmente

export function workspaceUidAtual(): string | null {
  if (!firebaseConfigurado) return null;
  const currentUid = auth()?.currentUser?.uid ?? null;
  if (!currentUid) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE) || '{}');
    return cached.workspaceUid || currentUid;
  } catch {
    return currentUid;
  }
}

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
    return snap.docs
      .map((d) => d.data() as PerfilUso)
      .filter((p) => !p.excluidoEm)
      .sort((a, b) => (b.ultimoAcessoEm ?? 0) - (a.ultimoAcessoEm ?? 0));
  } catch (e) {
    console.warn('Falha ao listar perfis de uso (só o master tem acesso):', e);
    return [];
  }
}

/** Obtém a contagem total de usuários cadastrados de forma performática e econômica. */
export async function obterContagemUsuarios(): Promise<number> {
  if (!firebaseConfigurado) return 12; // Valor fictício offline
  try {
    const coll = collection(fdb()!, 'perfisUso');
    const snap = await getCountFromServer(coll);
    const count = snap.data().count;
    try { localStorage.setItem('metrica.userCountCache', String(count)); } catch { /* ignore */ }
    return count;
  } catch (e) {
    console.warn('Erro ao obter contagem de usuários do servidor:', e);
    try {
      const cached = localStorage.getItem('metrica.userCountCache');
      if (cached) return Number(cached);
    } catch { /* ignore */ }
    return 12; // Fallback
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

const CAMPOS_COBRANCA_EMPRESA = ['statusPagamento', 'atrasadoDesde', 'mensalidade', 'vencimentoDia', 'observacoesAdmin'] as const;

/** Atualiza dados de faturamento/CRM de um cliente pelo proprietário. */
export async function atualizarPerfilUsoPorAdmin(clientUid: string, patch: Partial<PerfilUso>): Promise<void> {
  if (!firebaseConfigurado) return;
  try {
    await setDoc(doc(fdb()!, 'perfisUso', clientUid), patch, { merge: true });

    // Campos de cobrança também espelham na EMPRESA (Etapa 2b) — quem manda no bloqueio agora é a
    // empresa; sem isso, editar aqui não refletiria pra quem já está lendo o status por lá.
    const patchCobranca: Record<string, unknown> = {};
    for (const k of CAMPOS_COBRANCA_EMPRESA) if (k in patch) patchCobranca[k] = (patch as Record<string, unknown>)[k];
    if (Object.keys(patchCobranca).length === 0) return;

    const perfilSnap = await getDoc(doc(fdb()!, 'perfisUso', clientUid));
    const workspaceUid = perfilSnap.exists() ? (perfilSnap.data() as PerfilUso).workspaceUid : undefined;
    const empresaId = workspaceUid || clientUid;
    await setDoc(doc(fdb()!, 'empresas', empresaId), patchCobranca, { merge: true });
  } catch (e) {
    console.error('Falha ao atualizar perfil de uso pelo admin:', e);
    throw new Error('Erro ao salvar dados administrativos no banco de dados.');
  }
}

/** Apaga tudo que pertence a `uid`: projetos, cadastros, o credenciamento INCRA (se houver) e o
 *  perfil de uso. Compartilhada entre a exclusão pelo admin e a autoexclusão — sempre escopada a UM
 *  uid só, nunca ao workspace de outra pessoa (mesmo um convidado só tem essa árvore própria,
 *  normalmente vazia, já que o trabalho dele fica em `users/{workspaceUid}` de quem convidou). */
async function apagarDadosDoUsuario(uid: string): Promise<void> {
  const { deleteDoc, doc, collection, getDocs, getDoc } = await import('firebase/firestore');

  // 1. Tenta obter o credenciamentoIncra do usuário antes de deletar seu documento
  const userDocRef = doc(fdb()!, 'users', uid);
  const userSnap = await getDoc(userDocRef);
  let prefixoCredenciado: string | null = null;
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data?.tecnico?.credenciamentoIncra) {
      prefixoCredenciado = data.tecnico.credenciamentoIncra;
    }
  }

  // 2. Se o usuário tinha credenciamentoIncra cadastrado, limpa os pontos e o contador dele
  if (prefixoCredenciado) {
    const pontosColRef = collection(fdb()!, 'credenciados', prefixoCredenciado, 'pontos');
    const pontosSnap = await getDocs(pontosColRef);
    for (const d of pontosSnap.docs) {
      await deleteDoc(d.ref);
    }
    await deleteDoc(doc(fdb()!, 'credenciados', prefixoCredenciado));
  }

  // 3. Lista de subcoleções do usuário a serem limpas
  const subcolecoes = ['projetos', 'proprietarios', 'confrontantes', 'imoveis', 'cartorios', 'colegas'];

  for (const sub of subcolecoes) {
    const colRef = collection(fdb()!, 'users', uid, sub);
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }

  // Deleta o documento do usuário principal (contém configurações do técnico/escritório)
  await deleteDoc(userDocRef);

  // Deleta o perfil de uso (CRM)
  await deleteDoc(doc(fdb()!, 'perfisUso', uid));
}

/** Envia o perfil de uso de um cliente para a lixeira (suave), permitindo restauração rápida. */
export async function excluirPerfilUsoPorAdmin(clientUid: string): Promise<void> {
  if (!firebaseConfigurado) return;
  try {
    await setDoc(doc(fdb()!, 'perfisUso', clientUid), { excluidoEm: Date.now() }, { merge: true });
  } catch (e: unknown) {
    console.error('Falha ao mover perfil de uso para lixeira:', e);
    throw new Error(`Erro ao mover cliente para a lixeira: ${(e as Error)?.message || e}`);
  }
}

/** Lista os últimos 30 clientes da lixeira do SaaS. */
export async function listarLixeiraClientesSaaS(): Promise<PerfilUso[]> {
  if (!firebaseConfigurado) return [];
  try {
    const snap = await getDocs(collection(fdb()!, 'perfisUso'));
    return snap.docs
      .map((d) => d.data() as PerfilUso)
      .filter((p) => !!p.excluidoEm)
      .sort((a, b) => (b.excluidoEm ?? 0) - (a.excluidoEm ?? 0))
      .slice(0, 30);
  } catch (e) {
    console.warn('Falha ao listar lixeira de clientes SaaS:', e);
    return [];
  }
}

/** Restaura um cliente da lixeira do SaaS. */
export async function restaurarClienteSaaS(clientUid: string): Promise<void> {
  if (!firebaseConfigurado) return;
  try {
    await setDoc(doc(fdb()!, 'perfisUso', clientUid), { excluidoEm: null }, { merge: true });
  } catch (e) {
    console.error('Falha ao restaurar cliente da lixeira:', e);
    throw new Error('Erro ao restaurar cliente.');
  }
}

/** Exclui completamente e em definitivo o cliente e seus dados do banco. */
export async function excluirClienteDefinitivoPorAdmin(clientUid: string): Promise<void> {
  if (!firebaseConfigurado) return;
  try {
    await apagarDadosDoUsuario(clientUid);
  } catch (e: unknown) {
    console.error('Falha ao excluir perfil de uso em definitivo pelo admin:', e);
    throw new Error(`Erro ao excluir dados administrativos no banco: ${(e as Error)?.message || e}`);
  }
}

/** Autoexclusão: o próprio usuário logado apaga a conta e todos os dados dele (projetos, cadastros,
 *  banco de pontos, perfil). Depois apaga a conta de LOGIN também (Firebase Auth) — se a sessão for
 *  antiga, o Firebase pede login recente antes de deixar apagar (erro `auth/requires-recent-login`),
 *  então quem chama deve orientar a pessoa a sair e entrar de novo antes de tentar outra vez. */
export async function excluirMinhaConta(): Promise<void> {
  if (!firebaseConfigurado) throw new Error('Sem nuvem configurada — nada para apagar.');
  const usuario = auth()?.currentUser;
  if (!usuario) throw new Error('Você precisa estar logado para apagar a conta.');
  try {
    await apagarDadosDoUsuario(usuario.uid);
    const { deleteUser } = await import('firebase/auth');
    await deleteUser(usuario);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'auth/requires-recent-login') {
      throw new Error('Por segurança, o Firebase exige um login recente para apagar a conta. Saia e entre de novo, depois tente novamente.');
    }
    console.error('Falha ao apagar a própria conta:', e);
    throw new Error(`Erro ao apagar a conta: ${err?.message || e}`);
  }
}

/** Lista os membros já vinculados ao MEU workspace (convite já aceito) — cada um com o próprio
 *  perfil de uso, `workspaceUid` apontando pro meu uid. Não inclui eu mesmo(a). */
export async function listarMembrosDoWorkspace(): Promise<PerfilUso[]> {
  const meuUid = uid();
  if (!meuUid || !firebaseConfigurado) return [];
  try {
    const snap = await getDocs(query(collection(fdb()!, 'perfisUso'), where('workspaceUid', '==', meuUid)));
    return snap.docs.map((d) => d.data() as PerfilUso);
  } catch {
    return [];
  }
}

/** Desvincula um membro de equipe removendo o workspaceUid do perfil dele. */
export async function removerMembroDoWorkspace(membroUid: string): Promise<void> {
  if (!firebaseConfigurado) return;
  const meuUid = uid();
  if (!meuUid) throw new Error('Não autorizado.');
  const ref = doc(fdb()!, 'perfisUso', membroUid);
  await setDoc(ref, { workspaceUid: null }, { merge: true });
}

// ---- Convites por e-mail (vincular ajudante a uma empresa) ----
// Substitui o antigo "cole o UID de qualquer um pra entrar": aqui só quem foi convidado PELO
// e-mail exato consegue se vincular, e o dono nunca precisa expor um código secreto permanente.
// Guardado em `convites/{email}` (id = e-mail normalizado) — permite ao convidado consultar
// diretamente pelo próprio e-mail (get por id), sem precisar de uma query/lista mais complexa.

export interface ConvitePendente {
  email: string;
  empresaUid: string;
  empresaNome: string;
  criadoEm: number;
}

function normalizarEmail(e: string): string {
  return (e || '').trim().toLowerCase();
}

/** Convida alguém (pelo e-mail) a entrar no SEU workspace. Só o dono da empresa chama isso, no
 *  menu de ajustes. A pessoa convidada entra automaticamente ao logar com esse e-mail exato
 *  (ver `aceitarConviteSePendente`) — não precisa de código nenhum. */
export async function criarConvite(emailConvidado: string, empresaNome: string): Promise<void> {
  const meuUid = uid();
  if (!meuUid || !firebaseConfigurado) throw new Error('Faça login para convidar alguém.');
  const alvo = normalizarEmail(emailConvidado);
  if (!alvo || !alvo.includes('@')) throw new Error('Informe um e-mail válido.');
  if (alvo === normalizarEmail(email())) throw new Error('Esse é o seu próprio e-mail.');
  await setDoc(doc(fdb()!, 'convites', alvo), {
    email: alvo, empresaUid: meuUid, empresaNome: empresaNome || 'Sua empresa', criadoEm: Date.now(),
  } as ConvitePendente);
}

/** Lista os convites que EU enviei e que ainda não foram aceitos. */
export async function listarConvitesEnviados(): Promise<ConvitePendente[]> {
  const meuUid = uid();
  if (!meuUid || !firebaseConfigurado) return [];
  try {
    const snap = await getDocs(query(collection(fdb()!, 'convites'), where('empresaUid', '==', meuUid)));
    return snap.docs.map((d) => d.data() as ConvitePendente).sort((a, b) => b.criadoEm - a.criadoEm);
  } catch { return []; }
}

/** Cancela um convite ainda não aceito. */
export async function cancelarConvite(emailConvidado: string): Promise<void> {
  if (!firebaseConfigurado) return;
  try { await deleteDoc(doc(fdb()!, 'convites', normalizarEmail(emailConvidado))); } catch { /* ignore */ }
}

/**
 * Chamada logo após o login: se existir um convite pendente pro e-mail desta conta, aceita
 * automaticamente (vincula o workspace ao dono que convidou) e consome o convite. Devolve o
 * nome da empresa vinculada, ou null se não havia convite (o caminho normal, na maioria dos logins).
 */
export async function aceitarConviteSePendente(): Promise<string | null> {
  const meuEmail = normalizarEmail(email());
  if (!meuEmail || !firebaseConfigurado) return null;
  try {
    const s = await getDoc(doc(fdb()!, 'convites', meuEmail));
    if (!s.exists()) return null;
    const c = s.data() as ConvitePendente;
    await sincronizarPerfil({ workspaceUid: c.empresaUid });
    // Import dinâmico pra evitar ciclo estático (empresas.ts importa workspaceUidAtual daqui).
    const { entrarComoMembro } = await import('./empresas');
    await entrarComoMembro(c.empresaUid);
    await deleteDoc(doc(fdb()!, 'convites', meuEmail));
    return c.empresaNome || null;
  } catch {
    return null;
  }
}

// ---- Solicitações de vínculo (Auxiliar PEDE pra entrar; o dono APROVA) ----
// Substitui o antigo autovínculo instantâneo por e-mail, que era inseguro: qualquer um digitava o
// e-mail de um RT e caía dentro dos dados dele sem aprovação nenhuma. Agora o auxiliar só registra
// um pedido em `solicitacoesVinculo/{seuEmail}`; quem decide quem entra é o dono da empresa, que ao
// aprovar cria um convite comum (a única via que o Firestore aceita pra ligar o workspaceUid).

export interface SolicitacaoVinculo {
  solicitanteUid: string;
  solicitanteEmail: string;
  alvoEmail: string;
  criadoEm: number;
}

/** Auxiliar registra um pedido pra entrar no workspace do RT/empresa (pelo e-mail do RT). */
export async function criarSolicitacaoVinculo(alvoEmail: string): Promise<void> {
  const u = uid();
  const meuEmail = normalizarEmail(email());
  if (!u || !meuEmail || !firebaseConfigurado) throw new Error('Faça login para pedir vínculo.');
  const alvo = normalizarEmail(alvoEmail);
  if (!alvo || !alvo.includes('@')) throw new Error('Informe um e-mail válido.');
  if (alvo === meuEmail) throw new Error('Esse é o seu próprio e-mail.');
  await setDoc(doc(fdb()!, 'solicitacoesVinculo', meuEmail), {
    solicitanteUid: u, solicitanteEmail: meuEmail, alvoEmail: alvo, criadoEm: Date.now(),
  } as SolicitacaoVinculo);
}

/** O pedido pendente que EU (auxiliar) enviei, se houver — pra mostrar "aguardando aprovação". */
export async function minhaSolicitacaoPendente(): Promise<SolicitacaoVinculo | null> {
  const meuEmail = normalizarEmail(email());
  if (!meuEmail || !firebaseConfigurado) return null;
  try {
    const s = await getDoc(doc(fdb()!, 'solicitacoesVinculo', meuEmail));
    return s.exists() ? (s.data() as SolicitacaoVinculo) : null;
  } catch { return null; }
}

/** Cancela o meu próprio pedido de vínculo ainda não aprovado. */
export async function cancelarMinhaSolicitacao(): Promise<void> {
  const meuEmail = normalizarEmail(email());
  if (!meuEmail || !firebaseConfigurado) return;
  try { await deleteDoc(doc(fdb()!, 'solicitacoesVinculo', meuEmail)); } catch { /* ignore */ }
}

/** Pedidos de vínculo endereçados a MIM (dono/RT) e ainda não decididos. */
export async function listarSolicitacoesRecebidas(): Promise<SolicitacaoVinculo[]> {
  const meuEmail = normalizarEmail(email());
  if (!meuEmail || !firebaseConfigurado) return [];
  try {
    const snap = await getDocs(query(collection(fdb()!, 'solicitacoesVinculo'), where('alvoEmail', '==', meuEmail)));
    return snap.docs.map((d) => d.data() as SolicitacaoVinculo).sort((a, b) => b.criadoEm - a.criadoEm);
  } catch { return []; }
}

/** Aprova o pedido de um auxiliar: cria o convite (que libera o vínculo ao ele logar) e consome o
 *  pedido. É a ponte segura — o auxiliar nunca escreve o próprio workspaceUid; ele só entra depois
 *  que este convite, criado pelo dono, passa a existir. */
export async function aprovarSolicitacao(solicitanteEmail: string, empresaNome: string): Promise<void> {
  if (!firebaseConfigurado) return;
  await criarConvite(solicitanteEmail, empresaNome);
  try { await deleteDoc(doc(fdb()!, 'solicitacoesVinculo', normalizarEmail(solicitanteEmail))); } catch { /* ignore */ }
}

/** Recusa (apaga) o pedido de um auxiliar sem criar convite. */
export async function recusarSolicitacao(solicitanteEmail: string): Promise<void> {
  if (!firebaseConfigurado) return;
  try { await deleteDoc(doc(fdb()!, 'solicitacoesVinculo', normalizarEmail(solicitanteEmail))); } catch { /* ignore */ }
}

/** Obtém o perfil do usuário logado. Com fallback seguro pro cache local caso offline. */
export async function obterPerfilUsuario(): Promise<PerfilUso | null> {
  const u = uid();
  const cached = lerCache();
  if (!u || !firebaseConfigurado) {
    return Object.keys(cached).length ? (cached as PerfilUso) : null;
  }
  try {
    const s = await getDoc(doc(fdb()!, 'perfisUso', u));
    if (s.exists()) {
      const data = s.data() as PerfilUso;
      try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch { /* ignore */ }
      return data;
    }
    return Object.keys(cached).length ? (cached as PerfilUso) : null;
  } catch {
    return Object.keys(cached).length ? (cached as PerfilUso) : null;
  }
}
