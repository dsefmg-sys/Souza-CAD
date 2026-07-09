import { CORES_DIVISA, REPRESENTACOES, hidratarCoresDivisa } from '../topo/sigefVocab';
import { carregarTiposDivisaCustom } from './tiposDivisaCustom';

// Cores das divisas por projetista. Cada agrimensor pode preferir cores diferentes nas suas
// plantas — então as trocas ficam salvas (localStorage; migra pro perfil da empresa no
// multi-tenant). O valor efetivo de cada divisa = override do usuário, senão o padrão do sistema.

const KEY = 'metrica.coresDivisa';

export function carregarCoresDivisa(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

/** Carrega os overrides e injeta no motor de vocabulário (corDivisa passa a respeitá-los). */
export function iniciarCoresDivisa(): void {
  hidratarCoresDivisa(carregarCoresDivisa());
}

/** Salva a cor de um tipo de divisa (string vazia = volta ao padrão do sistema) e re-hidrata. */
export function salvarCorDivisa(tipo: string, cor: string): void {
  const atual = carregarCoresDivisa();
  if (!cor || cor === (CORES_DIVISA[tipo] ?? '')) delete atual[tipo];
  else atual[tipo] = cor;
  try { localStorage.setItem(KEY, JSON.stringify(atual)); } catch { /* ignore */ }
  hidratarCoresDivisa(atual);
}

/** Restaura todas as cores das divisas ao padrão do sistema. */
export function resetarCoresDivisa(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  hidratarCoresDivisa({});
}

/** Cor efetiva atual (override do usuário ou padrão) de cada tipo, pra montar a UI de ajuste.
 *  Inclui os tipos oficiais (REPRESENTACOES) e os cadastrados pelo próprio projetista. */
export function coresEfetivas(): { tipo: string; cor: string }[] {
  const ov = carregarCoresDivisa();
  const todos: string[] = [...REPRESENTACOES, ...carregarTiposDivisaCustom().map((t) => t.chave)];
  return todos.map((tipo) => ({ tipo, cor: ov[tipo] ?? CORES_DIVISA[tipo] ?? '' }));
}
