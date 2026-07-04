// Fator base do preço sugerido: o número que a empresa escolhe para o nível mais fácil da tabela
// (o "1000" da fórmula raiz-da-área). Começa no salário mínimo vigente, mas é totalmente editável —
// quem está começando pode usar um valor menor para formar clientela, é uma escolha do profissional.
// Guardado no navegador (mesmo padrão de preferências e preços); vai para a nuvem por empresa junto
// do multi-tenant.

/** Salário mínimo vigente, usado como valor de partida do fator base (editável pelo profissional).
 *  Atualizado para 2026. Ao virar o ano, basta trocar aqui. */
export const SALARIO_MINIMO_REFERENCIA = 1621;

const KEY = 'metrica.fatorPrecoBase';

/** Lê o fator base salvo; se nunca foi mexido, parte do salário mínimo de referência. */
export function carregarFatorBase(): number {
  if (typeof window === 'undefined') return SALARIO_MINIMO_REFERENCIA;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SALARIO_MINIMO_REFERENCIA;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : SALARIO_MINIMO_REFERENCIA;
  } catch {
    return SALARIO_MINIMO_REFERENCIA;
  }
}

export function salvarFatorBase(valor: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (Number.isFinite(valor) && valor > 0) localStorage.setItem(KEY, String(valor));
  } catch {
    /* ignore */
  }
}

// Desconto (em %) que o profissional escolhe aplicar na tabela toda. Pensado para o iniciante que
// quer cobrar abaixo da tabela e conquistar os primeiros clientes. Padrão zero (sem desconto).
const KEY_DESC = 'metrica.fatorPrecoDesconto';

export function carregarDescontoPct(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(KEY_DESC);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
  } catch {
    return 0;
  }
}

export function salvarDescontoPct(pct: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) localStorage.setItem(KEY_DESC, String(pct));
  } catch {
    /* ignore */
  }
}
