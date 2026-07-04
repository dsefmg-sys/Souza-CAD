// Padrões de trabalho da empresa que valem para NOVOS projetos: economizam cliques ao iniciar
// cada trabalho. Diferente de TecnicoData (assinatura) e das preferências (comportamento da tela),
// aqui ficam os valores iniciais que o projeto novo já nasce com eles. Guardado no navegador.

export interface PadroesProjeto {
  /** Tipo de azimute inicial: 'geodesico' (com convergência meridiana) ou 'plano'. Padrão: geodésico. */
  tipoAzimute: 'geodesico' | 'plano';
  /** Tipo de imóvel inicial. Padrão: rural. */
  tipoImovel: 'rural' | 'urbano';
  /** Comarca padrão para requerimento/errata quando o município não deixar claro. Vazio = usa o município. */
  comarcaPadrao: string;
  /** Natureza do serviço inicial (ex.: "Particular"). */
  naturezaServico: string;
}

export const PADROES_PADRAO: PadroesProjeto = {
  tipoAzimute: 'geodesico',
  tipoImovel: 'rural',
  comarcaPadrao: '',
  naturezaServico: 'Particular',
};

const KEY = 'metrica.padroesProjeto';

export function carregarPadroes(): PadroesProjeto {
  if (typeof window === 'undefined') return PADROES_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return PADROES_PADRAO;
    return { ...PADROES_PADRAO, ...JSON.parse(raw) };
  } catch {
    return PADROES_PADRAO;
  }
}

export function salvarPadroes(p: PadroesProjeto): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
