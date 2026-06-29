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
export const REPRESENTACOES = ['linha-ideal', 'cerca', 'estrada', 'corrego', 'rio', 'acude', 'muro', 'vala'] as const;
export type Representacao = (typeof REPRESENTACOES)[number];

export const REPRES_LABEL: Record<string, string> = {
  'linha-ideal': 'Linha ideal', cerca: 'Cerca', estrada: 'Estrada', corrego: 'Córrego',
  rio: 'Rio', acude: 'Açude', muro: 'Muro', vala: 'Vala',
};

/**
 * Cor de apoio que acompanha a divisa na planta (linha colorida externa à linha do perímetro),
 * só um reforço visual. Tipos sem cor (linha ideal, cerca) usam string vazia — desenham apenas
 * a linha/símbolo preto padrão.
 */
export const CORES_DIVISA: Record<string, string> = {
  'linha-ideal': '',
  cerca: '',
  estrada: '#ef4444',  // vermelho/salmão
  corrego: '#06b6d4',  // ciano
  rio: '#2563eb',      // azul
  acude: '#3b82f6',    // azul claro
  muro: '#6b7280',     // cinza
  vala: '#a16207',     // marrom
};

/** Cor de apoio da divisa, ou null quando o tipo não usa cor. */
export function corDivisa(representacao: string | undefined): string | null {
  const c = CORES_DIVISA[representacao || 'linha-ideal'];
  return c || null;
}
