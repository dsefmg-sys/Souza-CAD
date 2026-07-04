// Tabela de preços por tipo de serviço. Cada empresa cadastra os valores que costuma cobrar,
// e na gestão financeira do projeto dá pra puxar o valor com um clique, sem redigitar. Guardado
// no navegador (mesmo padrão de títulos e preferências); a migração pra nuvem por empresa entra
// junto do multi-tenant.

export interface PrecoServico {
  id: string;
  servico: string;  // ex.: "Georreferenciamento de imóvel rural (até 4 módulos)"
  valor: number;    // R$
}

const KEY = 'metrica.precosServico';

// Alguns preços de partida (o dono ajusta os valores). Servem só de exemplo editável.
export const PRECOS_PADRAO: PrecoServico[] = [
  { id: 'p_geo_rural', servico: 'Georreferenciamento de imóvel rural', valor: 0 },
  { id: 'p_retificacao', servico: 'Retificação de área', valor: 0 },
  { id: 'p_desmembramento', servico: 'Desmembramento', valor: 0 },
  { id: 'p_usucapiao', servico: 'Levantamento para usucapião', valor: 0 },
  { id: 'p_urbano', servico: 'Levantamento cadastral urbano', valor: 0 },
];

export function carregarPrecos(): PrecoServico[] {
  if (typeof window === 'undefined') return PRECOS_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return PRECOS_PADRAO;
    const salvos = JSON.parse(raw) as PrecoServico[];
    return Array.isArray(salvos) ? salvos : PRECOS_PADRAO;
  } catch {
    return PRECOS_PADRAO;
  }
}

export function salvarPrecos(lista: PrecoServico[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch { /* ignore */ }
}
