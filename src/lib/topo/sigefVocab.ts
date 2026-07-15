// Vocabulários controlados do SIGEF, extraídos da aba parametros_vertice do template oficial.
// Não inventar valores fora destas listas — o SIGEF rejeita.

export const TIPOS_VERTICE = ['M', 'P', 'V'] as const;

/** LA = Limite Artificial (cerca, muro, vala...), LN = Limite Natural (rio, córrego, crista...). */
export const TIPOS_LIMITE = [
  'LA1', 'LA2', 'LA3', 'LA4', 'LA5', 'LA6', 'LA7',
  'LN1', 'LN2', 'LN3', 'LN4', 'LN5', 'LN6',
] as const;

/** PG = GNSS; PA = apoio; PS = estação total/sem; PT = topográfico (inclui virtuais). */
export const METODOS_POSICIONAMENTO = [
  'PA1', 'PA2',
  'PG1', 'PG2', 'PG3', 'PG4', 'PG5', 'PG6', 'PG7', 'PG8', 'PG9',
  'PS1', 'PS2', 'PS3', 'PS4',
  'PT1', 'PT2', 'PT3', 'PT4', 'PT5', 'PT6', 'PT7', 'PT8',
] as const;

/** Métodos típicos de ponto virtual (sem ocupação física). */
export const METODOS_VIRTUAIS = ['PA1', 'PA2', 'PT8'] as const;

export const TIPO_LIMITE_PADRAO = 'LA6';
export const METODO_PADRAO = 'PG6';

/** Rótulos amigáveis para a representação visual da divisa na planta (Etapa 3). */
export const REPRESENTACOES = [
  'linha-ideal', 'cerca', 'estrada', 'corrego', 'rio', 'acude', 'muro', 'vala',
] as const;
export type Representacao = (typeof REPRESENTACOES)[number];

export const REPRES_LABEL: Record<string, string> = {
  'linha-ideal': 'Linha ideal', cerca: 'Cerca', estrada: 'Estrada', corrego: 'Córrego',
  rio: 'Rio', acude: 'Açude', muro: 'Muro', vala: 'Vala',
};

/**
 * Cor de apoio que acompanha a divisa na planta e no mapa (linha colorida EXTERNA à linha do
 * perímetro, pra não se sobrepor à cor do confrontante). Só a linha ideal fica sem cor de
 * propósito: é a ausência de divisa física, desenha apenas o traço padrão.
 */
export const CORES_DIVISA: Record<string, string> = {
  'linha-ideal': '',   // sem cor na PLANTA (papel branco); no MAPA sai branca quando pintada de propósito
  cerca: '#9ca3af',    // cinza médio
  estrada: '#ef4444',  // vermelho/salmão
  corrego: '#06b6d4',  // ciano
  rio: '#2563eb',      // azul
  acude: '#3b82f6',    // azul claro
  muro: '#6b7280',     // cinza
  vala: '#a16207',     // marrom
};

// Overrides de cor por projetista (injetados de coresDivisa.ts na inicialização). Ficam em módulo
// pra que corDivisa — chamada em muitos pontos de render — os respeite sem precisar receber props.
let coresOverride: Record<string, string> = {};
export function hidratarCoresDivisa(o: Record<string, string>): void { coresOverride = o || {}; }

/** Cor de apoio da divisa (override do usuário tem prioridade), ou null quando o tipo não usa cor. */
export function corDivisa(representacao: string | undefined): string | null {
  const key = representacao || 'linha-ideal';
  const c = key in coresOverride ? coresOverride[key] : CORES_DIVISA[key];
  return c || null;
}

/**
 * Retorna o tipo de limite SIGEF correto para um vértice/lado,
 * caindo de volta para a correspondência lógica com a representação se o tipoLimite não for informado ou for inválido.
 */
export function obterTipoLimiteEfetivo(v: { tipoLimite?: string; representacao?: string }, defaultLimite?: string): string {
  if (v.tipoLimite && (v.tipoLimite.startsWith('LA') || v.tipoLimite.startsWith('LN'))) {
    return v.tipoLimite;
  }
  const rep = v.representacao || 'linha-ideal';
  switch (rep) {
    case 'muro':
      return 'LA1';
    case 'cerca':
      return 'LA2';
    case 'vala':
      return 'LA3';
    case 'corrego':
    case 'rio':
    case 'acude':
      return 'LN1';
    case 'estrada':
    case 'linha-ideal':
    default:
      return defaultLimite || 'LA6';
  }
}

