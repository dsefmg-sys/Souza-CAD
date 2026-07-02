// Preferências globais do app (comportamentos que o dono pode ligar/desligar), guardadas no
// navegador. Diferente de TecnicoData/EscritorioData (dados fixos da assinatura/empresa), aqui
// ficam só interruptores de comportamento da interface e das validações.

export interface PreferenciasApp {
  /** Mostra os ícones do cabeçalho (além do texto). Padrão: true. */
  mostrarIconesCabecalho: boolean;
  /** Exige nome do cônjuge preenchido (proprietário/confrontante) antes de prosseguir. Padrão: false. */
  exigirConjuge: boolean;
  /** Exige o cartório (CNS) preenchido antes de gerar uma peça oficial. Padrão: false. */
  exigirCns: boolean;
  /** Mostra as dicas educativas do glossário de tipos de ato. Padrão: true. */
  mostrarDicasEducativas: boolean;
  /** Quando falso, um problema "grave" da conferência de exportação vira só aviso (pode prosseguir). Padrão: true (trava de verdade). */
  bloquearExportacaoIncompleta: boolean;
  /** Nível de experiência do agrimensor: muda a linguagem da ajuda/temas (iniciante = didática, experiente = objetiva). Padrão: iniciante. */
  nivelExperiencia: 'iniciante' | 'experiente';
}

export const PREFERENCIAS_PADRAO: PreferenciasApp = {
  mostrarIconesCabecalho: true,
  exigirConjuge: false,
  exigirCns: false,
  mostrarDicasEducativas: true,
  bloquearExportacaoIncompleta: true,
  nivelExperiencia: 'iniciante',
};

const KEY = 'metrica.preferencias';

export function carregarPreferencias(): PreferenciasApp {
  if (typeof window === 'undefined') return PREFERENCIAS_PADRAO;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return PREFERENCIAS_PADRAO;
    return { ...PREFERENCIAS_PADRAO, ...JSON.parse(raw) };
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}

export function salvarPreferencias(p: PreferenciasApp): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(p));
}
