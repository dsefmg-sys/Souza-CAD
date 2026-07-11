import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db as fdb, firebaseConfigurado } from '../firebase/client';
import { workspaceUidAtual } from './perfilUso';

// Entidade "Empresa": camada de metadados (papéis + cobrança) POR CIMA do workspace que já existia
// (`workspaceUid` em perfisUso, ver perfilUso.ts). `empresaId` é sempre o uid de quem criou a
// empresa (o dono original) — assim `users/{uid}/projetos` e demais subcoleções não mudam de lugar,
// só ganham este documento novo descrevendo quem pertence à empresa e se ela está em dia.
//
// Por quê: cobrança do SaaS decidida como POR EMPRESA (um valor cobre todo mundo dela), não por
// pessoa — antes cada `perfisUso/{uid}` tinha seu próprio status de pagamento, então um dono com
// dois colaboradores tinha 3 documentos de cobrança independentes em vez de 1 compartilhado.

export type PapelEmpresa = 'admin' | 'membro';

export interface Empresa {
  id: string; // == uid do dono
  nome: string;
  donoUid: string;
  criadoEm: number;
  membros: Record<string, PapelEmpresa>;
  statusPagamento: 'pago' | 'atrasado' | 'isento';
  atrasadoDesde: number | null;
  mensalidade?: number;
  vencimentoDia?: number;
  observacoesAdmin?: string;
  ultimoPagamentoId?: string;
  ultimoPagamentoEm?: number;
}

/**
 * Garante que a empresa do workspace ATUAL existe — cria na primeira vez, só se quem está logado
 * for o DONO (workspaceUid aponta pra si mesmo). Um convidado/auxiliar nunca cria a empresa de
 * outra pessoa; a dele já deve existir quando ele entra (senão o vínculo não faria sentido).
 * Migra, na criação, o que já existia solto em `perfisUso/{uid}` (mensalidade/vencimento/obs),
 * pra não perder o que o master já tinha preenchido antes desta etapa existir.
 */
export async function garantirEmpresaDoWorkspace(): Promise<void> {
  if (!firebaseConfigurado) return;
  const wsUid = workspaceUidAtual();
  if (!wsUid) return;
  try {
    const ref = doc(fdb()!, 'empresas', wsUid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;

    // Só o dono (workspace apontando pra si mesmo) cria a empresa dele.
    const { auth } = await import('../firebase/client');
    const meuUid = auth()?.currentUser?.uid;
    if (!meuUid || meuUid !== wsUid) return;

    // Migra o que já existia em perfisUso/{uid} (dados de faturamento soltos por pessoa).
    let migrado: Partial<Pick<Empresa, 'mensalidade' | 'vencimentoDia' | 'observacoesAdmin' | 'statusPagamento' | 'atrasadoDesde'>> = {};
    try {
      const perfilSnap = await getDoc(doc(fdb()!, 'perfisUso', meuUid));
      if (perfilSnap.exists()) {
        const p = perfilSnap.data() as { mensalidade?: number; vencimentoDia?: number; observacoesAdmin?: string; statusPagamento?: Empresa['statusPagamento']; atrasadoDesde?: number | null };
        migrado = {
          mensalidade: p.mensalidade,
          vencimentoDia: p.vencimentoDia,
          observacoesAdmin: p.observacoesAdmin,
          statusPagamento: p.statusPagamento,
          atrasadoDesde: p.atrasadoDesde ?? null,
        };
      }
    } catch { /* segue sem migrar — não é crítico */ }

    const { carregarEscritorio } = await import('./settings');
    let nome = '';
    try { nome = carregarEscritorio().nome || ''; } catch { /* ignore */ }

    const empresa: Empresa = {
      id: wsUid,
      nome: nome || 'Minha empresa',
      donoUid: wsUid,
      criadoEm: Date.now(),
      membros: { [wsUid]: 'admin' },
      statusPagamento: migrado.statusPagamento ?? 'atrasado',
      atrasadoDesde: migrado.atrasadoDesde ?? null,
      ...(migrado.mensalidade != null ? { mensalidade: migrado.mensalidade } : {}),
      ...(migrado.vencimentoDia != null ? { vencimentoDia: migrado.vencimentoDia } : {}),
      ...(migrado.observacoesAdmin ? { observacoesAdmin: migrado.observacoesAdmin } : {}),
    };
    await setDoc(ref, empresa);
  } catch { /* offline/sem permissão — segue sem empresa por enquanto, tenta de novo no próximo login */ }
}

/** Empresa do workspace atual (dono ou membro). null se não existir/sem nuvem. */
export async function minhaEmpresa(): Promise<Empresa | null> {
  if (!firebaseConfigurado) return null;
  const wsUid = workspaceUidAtual();
  if (!wsUid) return null;
  try {
    const snap = await getDoc(doc(fdb()!, 'empresas', wsUid));
    return snap.exists() ? (snap.data() as Empresa) : null;
  } catch {
    return null;
  }
}

/**
 * Registra o uid ATUAL como membro (papel 'membro') da empresa informada. Chamada depois que o
 * vínculo já foi estabelecido (workspaceUid setado) — convite aceito ou vínculo "Auxiliar" por
 * e-mail. Regra do Firestore restringe: só dá pra um uid adicionar A SI MESMO como 'membro', nunca
 * 'admin' nem mexer em outro campo — não precisa de permissão de escrita geral no documento.
 */
export async function entrarComoMembro(empresaId: string): Promise<void> {
  if (!firebaseConfigurado || !empresaId) return;
  try {
    const { auth } = await import('../firebase/client');
    const meuUid = auth()?.currentUser?.uid;
    if (!meuUid) return;
    await updateDoc(doc(fdb()!, 'empresas', empresaId), { [`membros.${meuUid}`]: 'membro' });
  } catch { /* offline/sem permissão — não bloqueia o vínculo em si, só a listagem de membros */ }
}

export async function atualizarEmpresaNaNuvem(patch: Partial<Pick<Empresa, 'nome'>>): Promise<void> {
  if (!firebaseConfigurado) return;
  const wsUid = workspaceUidAtual();
  if (!wsUid) return;
  try {
    await updateDoc(doc(fdb()!, 'empresas', wsUid), patch);
  } catch { /* ignore */ }
}
