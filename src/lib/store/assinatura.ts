import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as fdb, firebaseConfigurado } from '../firebase/client';

// COBRANÇA DO APP (assinatura do SaaS). Diferente de `precos.ts`, que é quanto o agrimensor cobra
// do CLIENTE dele por um serviço. Aqui é quanto o usuário paga pra USAR o Métrica.
//
// Guardado num doc global do Firestore (config/assinatura) com cache local — só o MASTER (dono do
// produto) edita; todos leem. Mesmo esquema do WhatsApp de suporte.
//
// Ideia da "escada de fidelidade": existe um VALOR CHEIO (100%) por plano, e cada usuário paga uma
// FRAÇÃO dele conforme o nível de parceria. Quem entra começa num preço de custo (20%) e vai subindo
// (40, 60, 80, 100%) à medida que fideliza. NÃO há desconto anual — a cobrança é sempre mensal.

const CACHE = 'metrica.assinatura';

export interface PlanoAssinatura {
  id: string;
  nome: string;
  descricao: string;
  /** Valor cheio, em R$/mês (o 100% da escada de fidelidade). */
  precoCheio: number;
  recursos: string[];
  /** Compromisso mínimo em meses. 0 = mensal. Reservado pro plano semestral (6) do futuro. */
  compromissoMinimoMeses: number;
  ativo: boolean;
}

export interface NivelFidelidade {
  /** Percentual do valor cheio que este nível paga (ex.: 20, 40, 60, 80, 100). */
  pct: number;
  rotulo: string;
}

export interface AtribuicaoUsuario {
  planoId: string;
  nivelPct: number;
}

export interface CupomDesconto {
  id: string;
  codigo: string;             // ex.: "SOUZA50", "DESCONTO12M" (sempre maiúsculo)
  pctDesconto: number;        // ex.: 50 = 50% de desconto
  tipoValidade: '12meses' | 'permanente' | 'unico';
  validadeAteMs?: number;     // timestamp limite (opcional) de validade
  usosMaximos?: number;       // quantidade máxima de resgates (opcional)
  usosAtuais: number;
  ativo: boolean;
}

export interface ConfigAssinatura {
  planos: PlanoAssinatura[];
  niveis: NivelFidelidade[];
  /** Nível de quem ainda não foi atribuído pelo admin (a entrada agressiva). */
  nivelPadraoPct: number;
  /** Texto mostrado a quem está abaixo de 100%, explicando o preço reduzido. */
  textoPrecoAgressivo: string;
  /** e-mail (minúsculo) -> plano + nível. O admin promove o usuário aqui. */
  atribuicoes: Record<string, AtribuicaoUsuario>;
  ocultarCobranca?: boolean;
  /** Cupons de desconto ativos do SaaS. */
  cupons?: Record<string, CupomDesconto>;
}

// ---- valores SUGERIDOS (o dono ajusta tudo na tela de Cobrança) ----
// Base: o Métrica é ferramenta profissional de georreferenciamento (SIGEF/INCRA) no Brasil. Um único
// serviço de georref já é cobrado do cliente na casa dos milhares de reais, e o app automatiza
// memorial, planilha, planta e requerimento. Uma assinatura mensal na faixa de R$ 129 (autônomo) a
// R$ 249 (escritório) é modesta frente ao valor que economiza. O dono muda à vontade.
export const CONFIG_ASSINATURA_PADRAO: ConfigAssinatura = {
  planos: [
    {
      id: 'autonomo',
      nome: 'Métrica Autônomo',
      descricao: 'Para o profissional que assina sozinho os seus trabalhos.',
      precoCheio: 129,
      compromissoMinimoMeses: 0,
      ativo: true,
      recursos: [
        'Importa o TXT do GNSS e calcula a área no SGL (padrão SIGEF)',
        'Memorial descritivo, planilha SIGEF (.ods) e planta em PDF',
        'Requerimento, errata e anuência prontos pro cartório',
        'Busca vizinhos certificados no INCRA e casa os vértices',
        'Leitor de documentos por IA, editor de DXF e módulo financeiro',
        'Projetos e banco de pontos salvos na nuvem',
      ],
    },
    {
      id: 'escritorio',
      nome: 'Métrica Escritório',
      descricao: 'Para a empresa com mais de um técnico assinando.',
      precoCheio: 249,
      compromissoMinimoMeses: 0,
      ativo: true,
      recursos: [
        'Tudo do plano Autônomo',
        'Vários responsáveis técnicos na mesma empresa',
        'Configurações e modelos compartilhados pela equipe',
        'Banco de pontos e numeração únicos do escritório',
      ],
    },
  ],
  niveis: [
    { pct: 20, rotulo: 'Fundador (preço de custo)' },
    { pct: 40, rotulo: 'Parceiro inicial' },
    { pct: 60, rotulo: 'Parceiro' },
    { pct: 80, rotulo: 'Consolidado' },
    { pct: 100, rotulo: 'Valor cheio' },
  ],
  nivelPadraoPct: 20,
  textoPrecoAgressivo:
    'Você está num preço reduzido, pensado só pra cobrir os custos operacionais do Métrica enquanto ' +
    'ele cresce. É um valor baixo de propósito, pra você adotar a ferramenta sem peso. Conforme a ' +
    'parceria se firma, o valor sobe aos poucos até o preço cheio.',
  atribuicoes: {},
};

function normalizar(bruto: Partial<ConfigAssinatura> | null | undefined): ConfigAssinatura {
  const c = { ...CONFIG_ASSINATURA_PADRAO, ...(bruto ?? {}) };
  // arrays/obj: garante os tipos certos mesmo se o doc vier incompleto
  if (!Array.isArray(c.planos) || c.planos.length === 0) c.planos = CONFIG_ASSINATURA_PADRAO.planos;
  if (!Array.isArray(c.niveis) || c.niveis.length === 0) c.niveis = CONFIG_ASSINATURA_PADRAO.niveis;
  if (!c.atribuicoes || typeof c.atribuicoes !== 'object') c.atribuicoes = {};
  if (!Number.isFinite(c.nivelPadraoPct)) c.nivelPadraoPct = CONFIG_ASSINATURA_PADRAO.nivelPadraoPct;
  c.ocultarCobranca = !!bruto?.ocultarCobranca;
  return c;
}

export async function carregarConfigAssinatura(): Promise<ConfigAssinatura> {
  if (firebaseConfigurado) {
    try {
      const s = await getDoc(doc(fdb()!, 'config', 'assinatura'));
      const cfg = normalizar(s.exists() ? (s.data() as Partial<ConfigAssinatura>) : null);
      try { localStorage.setItem(CACHE, JSON.stringify(cfg)); } catch { /* ignore */ }
      return cfg;
    } catch { /* offline/regras — cai pro cache */ }
  }
  try {
    const raw = localStorage.getItem(CACHE);
    return normalizar(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizar(null);
  }
}

export async function salvarConfigAssinatura(cfg: ConfigAssinatura): Promise<void> {
  const limpo = normalizar(cfg);
  try { localStorage.setItem(CACHE, JSON.stringify(limpo)); } catch { /* ignore */ }
  if (firebaseConfigurado) {
    await setDoc(doc(fdb()!, 'config', 'assinatura'), limpo, { merge: false });
  }
}

/** Preço (R$/mês) de um plano num dado percentual da escada de fidelidade. */
export function precoNoNivel(precoCheio: number, pct: number): number {
  const p = Math.max(0, Math.min(100, pct || 0));
  return Math.round((precoCheio * p) / 100 * 100) / 100;
}

/** Formata em real brasileiro (ex.: 25.8 -> "R$ 25,80"). */
export function formatBRL(v: number): string {
  return 'R$ ' + (Number.isFinite(v) ? v : 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Resolve o plano e o nível do usuário (pelo e-mail). Sem atribuição = plano ativo + nível padrão. */
export function atribuicaoDe(cfg: ConfigAssinatura, email: string | null | undefined): { plano: PlanoAssinatura | null; nivelPct: number } {
  const planosAtivos = cfg.planos.filter((p) => p.ativo);
  const chave = (email ?? '').trim().toLowerCase();
  const at = chave ? cfg.atribuicoes[chave] : undefined;
  if (at) {
    const plano = cfg.planos.find((p) => p.id === at.planoId) ?? planosAtivos[0] ?? null;
    return { plano, nivelPct: at.nivelPct };
  }
  // Sempre retorna o nível de fundador (20%) para quem está testando o app
  return { plano: planosAtivos[0] ?? null, nivelPct: 20 };
}

export interface BloqueioFaturamentoResult {
  bloqueadoPorFaturamento: boolean;
  diasAtrasoRestantes: number;
}

/**
 * Verifica se a conta deve ser bloqueada por faturamento atrasado
 * e quantos dias de tolerância restam (de um total de 7 dias).
 */
export function verificarBloqueioFaturamento(params: {
  statusPagamento: string | null | undefined;
  atrasadoDesde: number | null | undefined;
  souMaster: boolean;
  ocultarCobranca: boolean;
  agora?: number;
}): BloqueioFaturamentoResult {
  const { statusPagamento, atrasadoDesde, souMaster: isMaster, ocultarCobranca, agora = Date.now() } = params;
  if (!statusPagamento || statusPagamento !== 'atrasado' || isMaster || ocultarCobranca) {
    return { bloqueadoPorFaturamento: false, diasAtrasoRestantes: 15 };
  }
  const base = atrasadoDesde || agora;
  const diffMs = agora - base;
  const diasDecorridos = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diasRestantes = Math.max(0, 15 - diasDecorridos);
  return {
    bloqueadoPorFaturamento: diasRestantes <= 0,
    diasAtrasoRestantes: diasRestantes,
  };
}

export function validarCupom(
  cfg: ConfigAssinatura,
  codigoBruto: string
): { valido: boolean; mensagem: string; cupom?: CupomDesconto } {
  if (!codigoBruto || !codigoBruto.trim()) {
    return { valido: false, mensagem: 'Informe o código do cupom.' };
  }
  const cod = codigoBruto.trim().toUpperCase();
  const cupons = cfg.cupons || {};
  const cupom = cupons[cod];

  if (!cupom || !cupom.ativo) {
    return { valido: false, mensagem: 'Cupom inválido ou inativo.' };
  }

  if (cupom.validadeAteMs && Date.now() > cupom.validadeAteMs) {
    return { valido: false, mensagem: 'Este cupom já expirou.' };
  }

  if (cupom.usosMaximos && cupom.usosAtuais >= cupom.usosMaximos) {
    return { valido: false, mensagem: 'Limite de resgates deste cupom atingido.' };
  }

  const descTipo =
    cupom.tipoValidade === '12meses'
      ? `${cupom.pctDesconto}% OFF por 12 meses`
      : cupom.tipoValidade === 'permanente'
      ? `${cupom.pctDesconto}% OFF permanente`
      : `${cupom.pctDesconto}% OFF de uso único`;

  return {
    valido: true,
    mensagem: `Cupom "${cupom.codigo}" ativado! (${descTipo})`,
    cupom,
  };
}
