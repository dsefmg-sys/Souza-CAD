// Tipos de divisa CUSTOM cadastrados pelo projetista (ex.: "Cerca de arame farpado"), além dos
// tipos oficiais em REPRESENTACOES (sigefVocab.ts). Isto é só rótulo/estilo VISUAL da divisa no
// mapa e na planta — não entra na planilha SIGEF (a classificação oficial pro INCRA é outro campo,
// tipoLimite/TIPOS_LIMITE) — por isso é seguro deixar o projetista criar os que quiser aqui.

const KEY = 'metrica.tiposDivisaCustom';

export interface TipoDivisaCustom { chave: string; label: string }

function slugify(label: string): string {
  const base = label.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `custom-${base || Date.now().toString(36)}`;
}

export function carregarTiposDivisaCustom(): TipoDivisaCustom[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

/** Cadastra um novo tipo de divisa (idempotente por rótulo) e devolve o registro salvo. */
export function salvarTipoDivisaCustom(label: string): TipoDivisaCustom {
  const limpo = label.trim();
  const chave = slugify(limpo);
  const atuais = carregarTiposDivisaCustom();
  const existente = atuais.find((t) => t.chave === chave);
  if (existente) return existente;
  const novo: TipoDivisaCustom = { chave, label: limpo };
  atuais.push(novo);
  try { localStorage.setItem(KEY, JSON.stringify(atuais)); } catch { /* ignore */ }
  return novo;
}

export function excluirTipoDivisaCustom(chave: string): void {
  const atuais = carregarTiposDivisaCustom().filter((t) => t.chave !== chave);
  try { localStorage.setItem(KEY, JSON.stringify(atuais)); } catch { /* ignore */ }
}
